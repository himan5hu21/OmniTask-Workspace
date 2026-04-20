// src/services/message.service.ts
import { BaseRepository } from '@/repositories/base.repository';
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';
import type { Server } from 'socket.io';

const messageRepo = new BaseRepository('channelMessage');
const channelRepo = new BaseRepository('channel');
const channelMemberRepo = new BaseRepository('channelMember', false);

export class MessageService {
  // Get messages in a channel
  static async getChannelMessages(
    channelId: string,
    userId: string,
    options: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 20 } = options;

    // Check if user is member of the channel
    const membership = await channelMemberRepo.findOne({
      channel_id: channelId,
      user_id: userId
    });

    if (!membership) {
      throw new AppError('Access denied to this channel', HttpStatus.FORBIDDEN);
    }

    // Get channel name
    const channel = await channelRepo.getById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', HttpStatus.NOT_FOUND);
    }

    // Load latest messages first, then reverse the page so UI can render oldest -> newest.
    const { data: paginatedMessages, meta } = await messageRepo.getPaginated({
      page,
      limit,
      where: { channel_id: channelId },
      include: {
        sender: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    const messages = [...paginatedMessages].reverse();

    return {
      messages: messages.map((msg: any) => ({
        id: msg.id,
        content: msg.text,
        user_id: msg.sender_id,
        user_name: msg.sender.name,
        created_at: msg.created_at
      })),
      channelName: channel.name,
      pagination: {
        ...meta,
        hasMore: meta.page < meta.totalPages
      }
    };
  }

  // Create message in a channel
  static async createMessage(messageInput: { content: string }, channelId: string, userId: string, io?: Server) {
    const { content } = messageInput;

    // Check if user is member of the channel
    const membership = await channelMemberRepo.findOne({
      channel_id: channelId,
      user_id: userId
    });

    if (!membership) {
      throw new AppError('Access denied to this channel', HttpStatus.FORBIDDEN);
    }

    // Create message
    const message = await messageRepo.create(
      {
        text: content,
        channel_id: channelId,
        sender_id: userId
      },
      {
        include: {
          sender: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    );

    const messageData = {
      id: message.id,
      content: message.text,
      user_id: message.sender_id,
      user_name: message.sender.name,
      created_at: message.created_at
    };

    // Emit socket event
    if (io) {
      io.to(`channel:${channelId}`).emit('channel:message_created', messageData);
    }

    return messageData;
  }
}
