import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from '@/services/auth.service';
import { AppError } from '@/utils/AppError';
import { sendSuccess } from '@/utils/response';

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(3, 'Password must be at least 3 characters long'),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.email().optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(3, 'Current password is required'),
  newPassword: z.string().min(3, 'New password must be at least 3 characters long')
});


export const register = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name, email, password } = registerSchema.parse(request.body); 

  const user = await AuthService.register({ name, email, password });

  const token = request.server.jwt.sign( 
    { 
      userId: user.id, 
      email: user.email,
      name: user.name
    }, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } 
  );

  request.server.io?.emit('user:registered', { 
    userId: user.id, 
    email: user.email, 
    timestamp: new Date().toISOString() 
  });

  return sendSuccess(reply, {user, token}, 'CREATE', 'User registered successfully');
}

// Login user
export const login = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email, password } = loginSchema.parse(request.body); 

  const user = await AuthService.login({ email, password });

  // Generate JWT token with complete user data
  const token = request.server.jwt.sign( 
    { 
      userId: user.id, 
      email: user.email,
      name: user.name
    }, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } 
  );

  // Emit socket event for user login
  request.server.io?.emit('user:login', {
    userId: user.id,
    email: user.email,
    timestamp: new Date().toISOString()
  });

  return sendSuccess(reply, {
    token,
    user
  }, 'FETCH', 'Login successful');
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
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Emit socket event for user logout
    request.server.io?.emit('user:logout', {
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
  const updateData = updateProfileSchema.parse(request.body);
  
  const filteredData = Object.fromEntries(
    Object.entries(updateData).filter(([_, v]) => v !== undefined)
  ) as { name?: string; email?: string };
  
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
