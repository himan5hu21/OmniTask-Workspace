import { FastifyPluginAsync } from 'fastify';
import * as messageController from '@/modules/message/message.controller';
import { createSchema } from '@/utils/swagger';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';


const messageRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ==========================================
  // CHANNEL MESSAGES ROUTES
  // ==========================================
  app.get('/channels/:channelId/messages', createSchema({
    description: 'Get all messages for a specific channel',
    tags: ['Messages'],
    params: z.object({ channelId: z.cuid() }),
    querystring: messageController.getChannelMessagesQuerySchema,
  }), messageController.getChannelMessages);

  app.post('/channels/:channelId/messages', createSchema({
    description: 'Send a new message to a channel',
    tags: ['Messages'],
    params: z.object({ channelId: z.cuid() }),
    body: messageController.createMessageSchema,
  }), messageController.createChannelMessage);

};

export default messageRoutes;
