// src/services/message.service.ts
import { BaseRepository } from '@/repositories/base.repository';
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';
import type { Server } from 'socket.io';
import { AttachmentService, AttachmentData } from './attachment.service';

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
        },
        attachments: true
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
        created_at: msg.created_at,
        attachments: msg.attachments
      })),
      channelName: channel.name,
      pagination: {
        ...meta,
        hasMore: meta.page < meta.totalPages
      }
    };
  }

  // Create message in a channel
  static async createMessage(
    messageInput: { content?: string; attachments?: AttachmentData[] | undefined }, 
    channelId: string, 
    userId: string, 
    io?: Server
  ) {
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

    // Create attachments if any
    if (messageInput.attachments?.length) {
      await AttachmentService.createMessageAttachments(message.id, 'CHANNEL', messageInput.attachments);
    }

    // Re-fetch message with attachments
    const fullMessage = await messageRepo.findOne(
      { id: message.id },
      {
        include: {
          sender: { select: { id: true, name: true, email: true } },
          attachments: true
        }
      }
    );

    const messageData = {
      id: fullMessage.id,
      content: fullMessage.text,
      user_id: fullMessage.sender_id,
      user_name: fullMessage.sender.name,
      created_at: fullMessage.created_at,
      attachments: fullMessage.attachments
    };

    // Emit socket event
    if (io) {
      io.to(`channel:${channelId}`).emit('channel:message_created', messageData);
    }

    return messageData;
  }
}
