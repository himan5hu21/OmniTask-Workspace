// src/services/auth.service.ts
import bcrypt from 'bcrypt';
import { BaseRepository } from '@/repositories/base.repository';
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';
import { prisma } from '@/lib/database';
import crypto from 'node:crypto';
import { StorageService } from '@/lib/storage';

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
}
