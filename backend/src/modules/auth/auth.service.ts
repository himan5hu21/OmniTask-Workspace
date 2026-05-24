// src/services/auth.service.ts
import bcrypt from 'bcrypt';
import { BaseRepository } from '@/repositories/base.repository';
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';
import { prisma } from '@/lib/database';
import crypto from 'node:crypto';
import { StorageService } from '@/lib/storage';
import { sendMail } from '../../services/mail.service';

const userRepo = new BaseRepository('user');

export class AuthService {
  // 1. Updated Register with Reactivation
  static async register(userData: { name: string; email: string; password: string }) {
    const { name, email, password } = userData;

    // We use raw prisma here because we NEED to see soft-deleted users
    const existingUser = await prisma.user.findFirst({ where: { email } });

    if (existingUser) {
      // If user exists and is NOT deleted, it's a standard duplicate error
      if (existingUser.deleted_at === null) {
        throw new AppError('User with this email already exists', HttpStatus.BAD_REQUEST, { email: 'UNIQUE' });
      }

      // If user exists but WAS soft-deleted, we REACTIVATE them
      const hashedPassword = await bcrypt.hash(password, 10);
      const reactivatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password: hashedPassword,
          deleted_at: null, // Bring back to life
          is_active: true   // Ensure they are active
        }
      });

      return { id: reactivatedUser.id, name: reactivatedUser.name, email: reactivatedUser.email };
    }

    // Standard Create for brand new users
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepo.create({
      name,
      email,
      password: hashedPassword,
      is_active: true,
    });

    return { id: user.id, name: user.name, email: user.email };
  }

  // 2. Updated Login to ensure deleted users can't log in
  static async login(credentials: { email: string; password: string }) {
    const { email, password } = credentials;

    // userRepo automatically filters out soft-deleted users
    const user = await userRepo.findOne({ email, is_active: true });

    if (!user) {
      throw new AppError('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

    return { id: user.id, email: user.email, name: user.name, is_superadmin: user.is_superadmin };
  }

  // 3. Generate Token Pair (Access + Refresh)
  static async generateTokenPair(user: { id: string; email: string; name: string; is_superadmin?: boolean; token_version?: number }, jwt: any) {
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        is_superadmin: user.is_superadmin || false,
        tokenVersion: user.token_version || 0
      },
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } // Short lived
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.storeRefreshToken(user.id, refreshToken, expiresAt);

    return { accessToken, refreshToken };
  }

  // 4. Store Refresh Token (Hashed)
  static async storeRefreshToken(userId: string, token: string, expiresAt: Date) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.refreshToken.create({
      data: {
        user_id: userId,
        hashedToken,
        expires_at: expiresAt
      }
    });
  }

  // 5. Refresh Access Token (Rotation)
  static async refreshAccessToken(refreshToken: string, jwt: any) {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const tokenDoc = await prisma.refreshToken.findUnique({
      where: { hashedToken },
      include: { user: true }
    });

    if (!tokenDoc || tokenDoc.revoked || tokenDoc.expires_at < new Date()) {
      throw new AppError('Invalid or expired refresh token', HttpStatus.UNAUTHORIZED);
    }

    // Mark current token as revoked (rotation)
    await prisma.refreshToken.delete({
      where: { id: tokenDoc.id }
    });

    // Generate new pair
    return this.generateTokenPair(
      {
        id: tokenDoc.user.id,
        email: tokenDoc.user.email,
        name: tokenDoc.user.name,
        is_superadmin: tokenDoc.user.is_superadmin,
        token_version: tokenDoc.user.token_version
      },
      jwt
    );
  }

  // 6. Revoke Refresh Token
  static async revokeRefreshToken(refreshToken: string) {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.deleteMany({
      where: { hashedToken }
    });
  }

  // Get user by ID
  static async getUserById(userId: string) {
    const user = await userRepo.getById(userId, {
      select: { id: true, name: true, email: true, avatar_url: true, created_at: true, updated_at: true }
    });

    if (!user) {
      throw new AppError('User not found', HttpStatus.NOT_FOUND);
    }

    return {
      ...user,
      avatar_url: user.avatar_url ? StorageService.getFileUrl(user.avatar_url) : null
    };
  }

  // Update user profile
  static async updateProfile(userId: string, updateData: { name?: string; email?: string; avatar_url?: string }) {
    // Check if email is being updated and if it's already taken
    if (updateData.email) {
      const existingUser = await userRepo.findOne({ email: updateData.email });
      if (existingUser && existingUser.id !== userId) {
        throw new AppError('Validation failed', HttpStatus.BAD_REQUEST, { email: 'UNIQUE' });
      }
    }

    // If new avatar is provided, delete the old one
    if (updateData.avatar_url) {
      const currentUser = await userRepo.getById(userId, { select: { avatar_url: true } });
      if (currentUser?.avatar_url && currentUser.avatar_url !== updateData.avatar_url) {
        // Only delete if it's a local file (contains a slash and doesn't start with http)
        if (currentUser.avatar_url.includes('/') && !currentUser.avatar_url.startsWith('http')) {
          await StorageService.deleteFile(currentUser.avatar_url);
        }
      }
    }

    const updatedUser = await userRepo.update(userId, {
      ...updateData,
      updated_at: new Date()
    });

    return {
      ...updatedUser,
      avatar_url: updatedUser.avatar_url ? StorageService.getFileUrl(updatedUser.avatar_url) : null
    };
  }

  // Change password
  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // Get user with current password
    const user = await userRepo.findOne(
      { id: userId, is_active: true },
      { select: { id: true, password: true } }
    );

    if (!user) {
      throw new AppError('User not found', HttpStatus.NOT_FOUND);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', HttpStatus.BAD_REQUEST);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await userRepo.update(userId, {
      password: hashedNewPassword,
      token_version: { increment: 1 },
      updated_at: new Date()
    });

    return { success: true };
  }

  // Deactivate user account
  static async deactivateAccount(userId: string) {
    await userRepo.update(userId, {
      is_active: false,
      token_version: { increment: 1 },
      updated_at: new Date()
    });

    return { success: true };
  }

  // 11. Forgot Password
  static async forgotPassword(email: string) {
    // 1. Look up active user (filtering out soft-deleted)
    const user = await userRepo.findOne({ email: email.toLowerCase(), is_active: true });

    // 2. Prevent Email Enumeration: return success immediately even if user doesn't exist
    if (!user) {
      return { success: true };
    }

    // 3. Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    // Hash token with SHA-256 for secure DB storage
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Token is valid for 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // 4. Save token to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        reset_token: hashedToken,
        reset_token_expires_at: expiresAt,
      },
    });

    // 5. Construct URL
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // 6. Build Stunning HTML Email Template
    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your OmniTask password</title>
  
  <!-- Tailwind CSS v4 Play CDN -->
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  
  <style type="text/tailwindcss">
    @theme {
      --color-brand-primary: #6366f1;
      --color-brand-secondary: #8b5cf6;
      --color-brand-dark: #0b0f19;
    }
  </style>

  <!-- Complete Standard CSS Fallbacks for restricted email clients (like Gmail) with no JS support -->
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f3f4f6;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
      padding: 35px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .content {
      padding: 40px 35px;
    }
    .welcome-text {
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .reset-card {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
      text-align: center;
    }
    .cta-container {
      text-align: center;
      margin: 35px 0 20px;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      border-radius: 8px;
      box-shadow: 0 8px 16px -3px rgba(99, 102, 241, 0.3);
      transition: all 0.2s ease;
    }
    .btn:hover {
      box-shadow: 0 10px 20px -3px rgba(99, 102, 241, 0.5);
    }
    .expiry {
      font-size: 13px;
      color: #6b7280;
      text-align: center;
      margin-top: 15px;
    }
    .footer {
      padding: 30px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
      font-size: 12px;
      color: #9ca3af;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }

    /* Complete Dark Mode Fallbacks for mail clients with prefers-color-scheme */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0b0f19 !important;
        color: #f3f4f6 !important;
      }
      .wrapper {
        background-color: #0b0f19 !important;
      }
      .container {
        background: linear-gradient(135deg, #111827 0%, #1f2937 100%) !important;
        border-color: rgba(99, 102, 241, 0.2) !important;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3) !important;
      }
      .welcome-text {
        color: #d1d5db !important;
      }
      .reset-card {
        background-color: rgba(255, 255, 255, 0.03) !important;
        border-color: rgba(255, 255, 255, 0.05) !important;
      }
      .expiry {
        color: #9ca3af !important;
      }
      .footer {
        border-top-color: rgba(255, 255, 255, 0.05) !important;
        color: #6b7280 !important;
      }
    }
  </style>
</head>
<body class="bg-gray-100 text-gray-800 font-sans antialiased dark:bg-brand-dark dark:text-slate-100">
  <div class="wrapper py-10 bg-gray-100 dark:bg-brand-dark">
    <div class="container mx-auto max-w-[600px] bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden dark:bg-linear-to-br dark:from-slate-900 dark:to-slate-800 dark:border-indigo-950/40 dark:shadow-indigo-950/20">
      <div class="header bg-linear-to-r from-indigo-600 to-violet-600 py-9 px-8 text-center">
        <h1 class="text-white text-3xl font-extrabold tracking-tight m-0">OmniTask</h1>
      </div>
      <div class="content py-10 px-9">
        <p class="welcome-text text-base leading-relaxed text-gray-600 m-0 mb-6 dark:text-gray-300">
          Hello <strong>${user.name}</strong>,
        </p>
        <p class="welcome-text text-base leading-relaxed text-gray-600 m-0 mb-6 dark:text-gray-300">
          We received a request to reset the password for your OmniTask account. If you did not make this request, you can safely ignore this email.
        </p>
        
        <p class="welcome-text text-sm leading-relaxed text-gray-600 m-0 mb-6 dark:text-gray-300">
          To reset your password, please click the secure button below:
        </p>

        <div class="cta-container text-center my-9">
          <a href="${resetLink}" class="btn inline-block bg-linear-to-r from-indigo-500 to-violet-500 text-white font-semibold text-sm py-3.5 px-8 rounded-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.01] transition-all duration-200">Reset Password</a>
          <p class="expiry text-xs text-gray-500 mt-4 dark:text-gray-400">This link is secure and will expire in 1 hour.</p>
        </div>

        <div class="reset-card bg-gray-50 border border-gray-200 rounded-xl p-6 dark:bg-white/5 dark:border-white/5">
          <p class="welcome-text text-xs leading-relaxed text-gray-400 m-0 dark:text-gray-400">
            If the button doesn't work, copy and paste this URL into your browser address bar:
          </p>
          <p class="welcome-text text-xs leading-relaxed font-mono text-indigo-600 m-0 mt-2 break-all dark:text-indigo-400">
            ${resetLink}
          </p>
        </div>
      </div>
      <div class="footer text-center py-7 border-t border-gray-100 dark:border-white/5">
        <p class="text-[11px] text-gray-400 m-0 mb-2 dark:text-gray-500">For your security, never forward this email to anyone.</p>
        <p class="text-[11px] text-gray-400 m-0 dark:text-gray-500">© 2026 OmniTask. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // 7. Dispatch the email asynchronously
    sendMail(user.email, 'Reset your OmniTask Password', emailHtml)
      .catch((err: any) => {
        console.error('❌ [AuthService] Failed to send password reset email:', err.message);
      });

    return { success: true };
  }

  // 12. Reset Password
  static async resetPassword(token: string, newPassword: string) {
    // 1. Hash the incoming token to match DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find user with valid token and not expired
    const user = await prisma.user.findFirst({
      where: {
        reset_token: hashedToken,
        reset_token_expires_at: {
          gt: new Date()
        },
        is_active: true
      }
    });

    if (!user) {
      throw new AppError('The password reset link is invalid or has expired', HttpStatus.BAD_REQUEST);
    }

    // 3. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update password, clear reset fields, and increment token_version (invalidates active JWTs!)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expires_at: null,
        token_version: { increment: 1 },
        updated_at: new Date()
      }
    });

    return { success: true };
  }
}
