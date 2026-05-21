// src/controllers/message.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { MessageService } from '@/modules/message/message.service';
import { sendSuccess } from '@/utils/response';

export const createMessageSchema = z.object({
  content: z.string().optional().or(z.literal('')),
  attachments: z.array(z.any()).optional()
}).refine(data => (data.content && data.content.trim().length > 0) || (data.attachments && data.attachments.length > 0), {
  message: "Either message content or attachments are required",
  path: ["content"]
});


export const getChannelMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});


// Get messages in a channel
export const getChannelMessages = async (request: FastifyRequest, reply: FastifyReply) => {
  const { channelId } = request.params as { channelId: string };
  const user = (request as any).user;
  const { page, limit } = getChannelMessagesQuerySchema.parse(request.query ?? {});

  const messagesData = await MessageService.getChannelMessages(channelId, user.userId, { page, limit });

  return sendSuccess(reply, messagesData, 'FETCH', 'Messages retrieved successfully');
};

// Create message in a channel
export const createChannelMessage = async (request: FastifyRequest, reply: FastifyReply) => {
  const { channelId } = request.params as { channelId: string };
  const { content, attachments } = createMessageSchema.parse(request.body);
  const user = (request as any).user;

  const message = await MessageService.createMessage({ content, attachments }, channelId, user.userId, request.server.io);

  return sendSuccess(reply, { message }, 'CREATE', 'Message sent successfully');
};

// Edit a message
export const editMessage = async (request: FastifyRequest, reply: FastifyReply) => {
  const { messageId } = request.params as { messageId: string };
  const { content } = z.object({ content: z.string().min(1) }).parse(request.body);
  const user = (request as any).user;

  const message = await MessageService.editMessage(messageId, content, user.userId, request.server.io);

  return sendSuccess(reply, { message }, 'UPDATE', 'Message updated successfully');
};

// Delete a message
export const deleteMessage = async (request: FastifyRequest, reply: FastifyReply) => {
  const { messageId } = request.params as { messageId: string };
  const user = (request as any).user;

  const result = await MessageService.deleteMessage(messageId, user.userId, request.server.io);

  return sendSuccess(reply, result, 'DELETE', 'Message deleted successfully');
};
