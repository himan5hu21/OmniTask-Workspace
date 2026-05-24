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

  app.put('/messages/:messageId', createSchema({
    description: 'Edit a message',
    tags: ['Messages'],
    params: z.object({ messageId: z.cuid() }),
    body: z.object({ content: z.string().min(1) }),
  }), messageController.editMessage);

  app.delete('/messages/:messageId', createSchema({
    description: 'Delete a message',
    tags: ['Messages'],
    params: z.object({ messageId: z.cuid() }),
  }), messageController.deleteMessage);

  app.delete('/messages/attachments/:attachmentId', createSchema({
    description: 'Delete a single message attachment',
    tags: ['Messages'],
    params: z.object({ attachmentId: z.cuid() }),
  }), messageController.deleteAttachment);

  // ==========================================
  // DIRECT MESSAGES ROUTES
  // ==========================================
  app.get('/conversations', createSchema({
    description: 'Get all direct conversations for user',
    tags: ['Messages'],
  }), messageController.getConversations);

  app.post('/conversations', createSchema({
    description: 'Start or retrieve a direct conversation with another user',
    tags: ['Messages'],
    body: messageController.getOrCreateConversationSchema,
  }), messageController.getOrCreateConversation);

  app.get('/conversations/:conversationId/messages', createSchema({
    description: 'Get direct messages for a conversation',
    tags: ['Messages'],
    params: z.object({ conversationId: z.cuid() }),
    querystring: messageController.getDirectMessagesQuerySchema,
  }), messageController.getDirectMessages);

  app.post('/conversations/:conversationId/messages', createSchema({
    description: 'Send a new direct message',
    tags: ['Messages'],
    params: z.object({ conversationId: z.cuid() }),
    body: messageController.createMessageSchema,
  }), messageController.createDirectMessage);

  app.put('/conversations/messages/:messageId', createSchema({
    description: 'Edit a direct message',
    tags: ['Messages'],
    params: z.object({ messageId: z.cuid() }),
    body: z.object({ content: z.string().min(1) }),
  }), messageController.editDirectMessage);

  app.delete('/conversations/messages/:messageId', createSchema({
    description: 'Delete a direct message',
    tags: ['Messages'],
    params: z.object({ messageId: z.cuid() }),
  }), messageController.deleteDirectMessage);

};

export default messageRoutes;
