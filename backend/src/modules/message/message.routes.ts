import { FastifyPluginAsync } from 'fastify';
import * as messageController from '@/modules/message/message.controller';

const messageRoutes: FastifyPluginAsync = async (fastify) => {
  // ==========================================
  // CHANNEL MESSAGES ROUTES
  // ==========================================
  fastify.get('/channels/:channelId/messages', messageController.getChannelMessages);
  fastify.post('/channels/:channelId/messages', messageController.createChannelMessage);
};

export default messageRoutes;
