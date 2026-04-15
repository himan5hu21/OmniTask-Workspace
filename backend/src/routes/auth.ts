import { FastifyPluginAsync } from 'fastify'; //
// Badha exported functions ne 'authController' na naam thi import kari lo
import * as authController from '@/controllers/auth.controller'; 

const authRoutes: FastifyPluginAsync = async (fastify) => { 
  
  // Ekdum clean ane short routes! Koi .bind() ni jarur nathi.
  fastify.post('/register',{ config: { isPublic: true } }, authController.register); 
  fastify.post('/login',{ config: { isPublic: true } }, authController.login); 
  
  // Baki badha routes automatic protected thai jase (isPublic aapvani jarur nathi)
  fastify.get('/profile', authController.getProfile); 
  fastify.post('/logout', authController.logout);
    
    // Udaharan:
    // fastify.put('/update-password', authController.updatePassword);
    // fastify.delete('/delete-account', authController.deleteAccount);
  
};

export default authRoutes; 