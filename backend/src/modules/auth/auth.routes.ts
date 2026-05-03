import { FastifyPluginAsync } from 'fastify';
import * as authController from '@/modules/auth/auth.controller';
import { createSchema } from '@/utils/swagger';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';



const authRoutes: FastifyPluginAsync = async (fastify) => { 
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  
  // Public Routes
  app.post('/register', { 
    ...createSchema({
      description: 'Register a new user',
      tags: ['Auth'],
      body: authController.registerSchema,
    }),
    config: { isPublic: true } 
  }, authController.register); 

  app.post('/login', { 
    ...createSchema({
      description: 'Login user and get access token',
      tags: ['Auth'],
      body: authController.loginSchema,
    }),
    config: { isPublic: true } 
  }, authController.login); 

  app.post('/refresh', { 
    ...createSchema({
      description: 'Refresh access token',
      tags: ['Auth'],
    }),
    config: { isPublic: true } 
  }, authController.refreshToken); 
  
  // Protected Routes
  app.get('/profile', {
    ...createSchema({
      description: 'Get current user profile',
      tags: ['Auth'],
    }),
  }, authController.getProfile); 

  app.patch('/profile', {
    ...createSchema({
      description: 'Update user profile',
      tags: ['Auth'],
      body: authController.updateProfileSchema,
    }),
  }, authController.updateProfile); 
  
  app.post('/logout', {
    ...createSchema({
      description: 'Logout user and revoke refresh token',
      tags: ['Auth'],
    }),
  }, authController.logout);

  app.patch('/change-password', {
    ...createSchema({
      description: 'Change user password',
      tags: ['Auth'],
      body: authController.changePasswordSchema,
    }),
  }, authController.changePassword);

  app.delete('/deactivate', {
    ...createSchema({
      description: 'Deactivate user account',
      tags: ['Auth'],
    }),
  }, authController.deactivateAccount);
};

export default authRoutes; 