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

  const message = await MessageService.createMessage({ content }, channelId, user.userId);

  // Socket Event: Broadcast message to channel
  request.server.io?.emit(`channel:${channelId}:message_created`, {
    messageId: message.id,
    content: message.content,
    user_id: message.user_id,
    user_name: message.user_name,
    created_at: message.created_at
  });

  return sendSuccess(reply, { message }, 'CREATE', 'Message sent successfully');
};
