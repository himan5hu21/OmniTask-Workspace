import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AppError } from '@/utils/AppError';
import { sendSuccess } from '@/utils/response';
import { AuthService } from '@/modules/auth/auth.service';
import { StorageService } from '@/lib/storage';

// Validation schemas
export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(3, 'Password must be at least 3 characters long'),
});



export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});


export const refreshSchema = z.object({
  refreshToken: z.string(),
});


export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.email().optional(),
  avatar_url: z.url('Invalid avatar URL').optional().or(z.literal(''))
});


export const changePasswordSchema = z.object({
  currentPassword: z.string().min(3, 'Current password is required'),
  newPassword: z.string().min(3, 'New password must be at least 3 characters long'),
});



const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, // Allowing 'none' for cross-origin development
  path: '/', // Root path to allow /refresh and /logout access
  maxAge: 7 * 24 * 60 * 60 // 7 days
};


export const register = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name, email, password } = registerSchema.parse(request.body); 

  const user = await AuthService.register({ name, email, password });

  const { accessToken, refreshToken } = await AuthService.generateTokenPair(
    { id: user.id, email: user.email, name: user.name },
    request.server.jwt
  );

  reply.setCookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  request.server.io?.to(`user:${user.id}`).emit('user:registered', { 
    userId: user.id, 
    email: user.email, 
    timestamp: new Date().toISOString() 
  });

  return sendSuccess(reply, { user, accessToken }, 'CREATE', 'User registered successfully');
}

// Login user
export const login = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email, password } = loginSchema.parse(request.body); 

  const user = await AuthService.login({ email, password });

  const { accessToken, refreshToken } = await AuthService.generateTokenPair(
    user,
    request.server.jwt
  );

  reply.setCookie('refreshToken', refreshToken, COOKIE_OPTIONS);

  // Emit socket event for user login (targeted room)
  request.server.io?.to(`user:${user.id}`).emit('user:login', {
    userId: user.id,
    email: user.email,
    timestamp: new Date().toISOString()
  });

  return sendSuccess(reply, {
    accessToken,
    user
  }, 'FETCH', 'Login successful');
}

// Refresh token
export const refreshToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const oldToken = request.cookies?.refreshToken;

  // Throw 401 instead of a Zod 400 error so the frontend interceptor handles it correctly
  if (!oldToken) {
    throw new AppError('Refresh token missing or expired. Please log in again.', 401);
  }

  const { accessToken, refreshToken: newToken } = await AuthService.refreshAccessToken(oldToken, request.server.jwt);

  reply.setCookie('refreshToken', newToken, COOKIE_OPTIONS);

  return sendSuccess(reply, { accessToken }, 'FETCH', 'Token refreshed successfully');
}

// Get current user profile
export const getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    
    const userProfile = await AuthService.getUserById(user.userId);
    
    return sendSuccess(reply, userProfile, 'FETCH', 'Profile retrieved successfully');
}

// Logout user
export const logout = async (request: FastifyRequest, reply: FastifyReply) => {
    // JWT middleware ne request.user ma set kari didhu
    const user = (request as any).user;
    const refreshToken = request.cookies.refreshToken;
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (refreshToken) {
      await AuthService.revokeRefreshToken(refreshToken);
    }

    reply.clearCookie('refreshToken', COOKIE_OPTIONS);
    
    // Emit socket event for user logout (targeted room)
    request.server.io?.to(`user:${user.userId}`).emit('user:logout', {
      userId: user.userId,
      email: user.email,
      timestamp: new Date().toISOString()
    });
    
    return sendSuccess(reply, {
      message: "Logged out successfully"
    }, 'FETCH', 'Logout successful');
}

// 👈 NAVI METHODS UMERI: Update Profile
export const updateProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;
  let updateData: any = {};
  let avatarUrl: string | undefined;

  if (request.isMultipart()) {
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname === 'avatar_url' || part.fieldname === 'file') {
          const buffer = await part.toBuffer();
          const saved = await StorageService.saveFile({
            filename: part.filename,
            buffer,
            mimetype: part.mimetype
          }, 'user');
          avatarUrl = saved.file_url;
        }
      } else {
        // Handle non-file fields
        updateData[part.fieldname] = part.value;
      }
    }
  } else {
    updateData = updateProfileSchema.parse(request.body);
    avatarUrl = updateData.avatar_url;
  }
  
  const filteredData: { name?: string; email?: string; avatar_url?: string } = {};
  if (updateData.name) filteredData.name = String(updateData.name);
  if (updateData.email) filteredData.email = String(updateData.email);
  if (avatarUrl) filteredData.avatar_url = avatarUrl;
  
  const updatedUser = await AuthService.updateProfile(user.userId, filteredData);
  
  return sendSuccess(reply, updatedUser, 'UPDATE', 'Profile updated successfully');
}

// 👈 NAVI METHODS UMERI: Change Password
export const changePassword = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;
  const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
  
  await AuthService.changePassword(user.userId, currentPassword, newPassword);
  
  return sendSuccess(reply, null, 'UPDATE', 'Password changed successfully');
}

// 👈 NAVI METHODS UMERI: Deactivate Account
export const deactivateAccount = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;
  
  await AuthService.deactivateAccount(user.userId);
  
  return sendSuccess(reply, null, 'DELETE', 'Account deactivated successfully');
}
