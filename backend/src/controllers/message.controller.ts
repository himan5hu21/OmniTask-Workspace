// src/controllers/message.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { MessageService } from '@/services/message.service';
import { sendSuccess } from '@/utils/response';

const createMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required')
});

// Get messages in a channel
export const getChannelMessages = async (request: FastifyRequest, reply: FastifyReply) => {
  const { channelId } = request.params as { channelId: string };
  const user = (request as any).user;

  const messagesData = await MessageService.getChannelMessages(channelId, user.userId);

  return sendSuccess(reply, messagesData, 'FETCH', 'Messages retrieved successfully');
};

// Create message in a channel
export const createChannelMessage = async (request: FastifyRequest, reply: FastifyReply) => {
  const { channelId } = request.params as { channelId: string };
  const { content } = createMessageSchema.parse(request.body);
  const user = (request as any).user;

  const message = await MessageService.createMessage({ content }, channelId, user.userId, request.server.io);

  return sendSuccess(reply, { message }, 'CREATE', 'Message sent successfully');
};
