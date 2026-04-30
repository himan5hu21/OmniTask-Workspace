import { FastifyPluginAsync } from 'fastify';
import * as authController from '@/modules/auth/auth.controller';

const authRoutes: FastifyPluginAsync = async (fastify) => { 
  
  // Public Routes
  fastify.post('/register', { config: { isPublic: true } }, authController.register); 
  fastify.post('/login', { config: { isPublic: true } }, authController.login); 
  fastify.post('/refresh', { config: { isPublic: true } }, authController.refreshToken); 
  
  // Protected Routes (Tame /me pan rakhi shako chho execution plan pramane, pan /profile pan ekdam barabar chhe)
  fastify.get('/profile', authController.getProfile); 
  fastify.patch('/profile', authController.updateProfile); // 👈 Navi route
  
  fastify.post('/logout', authController.logout);
  fastify.patch('/change-password', authController.changePassword); // 👈 Navi route
  fastify.delete('/deactivate', authController.deactivateAccount); // 👈 Navi route
  
};

export default authRoutes; 