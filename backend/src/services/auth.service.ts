// src/services/auth.service.ts
import bcrypt from 'bcrypt';
import { BaseRepository } from '@/repositories/base.repository';
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';

const userRepo = new BaseRepository('user');

export class AuthService {
  // Register new user
  static async register(userData: { name: string; email: string; password: string }) {
    const { name, email, password } = userData;

    // Check if user already exists
    const existingUser = await userRepo.findOne({ email });
    if (existingUser) {
      throw new AppError('Validation failed', 400, { email: 'UNIQUE' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await userRepo.create({
      name,
      email,
      password: hashedPassword,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email
    };
  }

  // Login user
  static async login(credentials: { email: string; password: string }) {
    const { email, password } = credentials;

    // Find user with password
    const user = await userRepo.findOne(
      { email, is_active: true },
      { select: { id: true, name: true, email: true, password: true, created_at: true } }
    );

    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new AppError('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at
    };
  }

  // Get user by ID
  static async getUserById(userId: string) {
    const user = await userRepo.getById(userId, {
      select: { id: true, name: true, email: true, created_at: true, updated_at: true }
    });

    if (!user) {
      throw new AppError('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  // Update user profile
  static async updateProfile(userId: string, updateData: { name?: string; email?: string }) {
    // Check if email is being updated and if it's already taken
    if (updateData.email) {
      const existingUser = await userRepo.findOne({ email: updateData.email });
      if (existingUser && existingUser.id !== userId) {
        throw new AppError('Validation failed', HttpStatus.BAD_REQUEST, { email: 'UNIQUE' });
      }
    }

    const updatedUser = await userRepo.update(userId, {
      ...updateData,
      updated_at: new Date()
    });

    return updatedUser;
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
      updated_at: new Date()
    });

    return { success: true };
  }

  // Deactivate user account
  static async deactivateAccount(userId: string) {
    await userRepo.update(userId, {
      is_active: false,
      updated_at: new Date()
    });

    return { success: true };
  }
}
