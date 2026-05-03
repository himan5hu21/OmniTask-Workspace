// src/services/message.service.ts
import { BaseRepository } from '@/repositories/base.repository';
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';
import type { Server } from 'socket.io';
import { AttachmentService, AttachmentData } from '@/modules/attachment/attachment.service';
import { PermissionGuard } from '@/utils/permissions';
import { StorageService } from '@/lib/storage';

const messageRepo = new BaseRepository('channelMessage');
const channelRepo = new BaseRepository('channel');
const channelMemberRepo = new BaseRepository('channelMember', false);
const orgMemberRepo = new BaseRepository('organizationMember', false);

export class MessageService {
  // Get messages in a channel
  static async getChannelMessages(
    channelId: string,
    userId: string,
    options: { page?: number; limit?: number } | undefined = {}
  ) {
    const { page = 1, limit = 20 } = options;

    const channel = await channelRepo.getById(channelId);
    if (!channel) throw new AppError('Channel not found', HttpStatus.NOT_FOUND);

    const orgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: userId });
    const channelMembership = await channelMemberRepo.findOne({ channel_id: channelId, user_id: userId });

    // Capability Check: message.read
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'message.read')) {
      throw new AppError('You lack message.read capability for this channel', HttpStatus.FORBIDDEN);
    }

    const { data: paginatedMessages, meta } = await messageRepo.getPaginated({
      page, limit,
      where: { channel_id: channelId },
      include: {
        sender: { select: { id: true, name: true, email: true } },
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
        attachments: msg.attachments.map((att: any) => ({
          ...att,
          file_url: StorageService.getFileUrl(att.file_url)
        }))
      })),
      channelName: channel.name,
      pagination: { ...meta, hasMore: meta.page < meta.totalPages }
    };
  }

  // Create message in a channel
  static async createMessage(
    messageInput: { content?: string | undefined; attachments?: AttachmentData[] | undefined }, 
    channelId: string, 
    userId: string, 
    io?: Server
  ) {
    const { content } = messageInput;

    const channel = await channelRepo.getById(channelId);
    if (!channel) throw new AppError('Channel not found', HttpStatus.NOT_FOUND);

    const orgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: userId });
    const channelMembership = await channelMemberRepo.findOne({ channel_id: channelId, user_id: userId });

    // Capability Check: message.send
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'message.send')) {
      throw new AppError('You lack message.send capability for this channel', HttpStatus.FORBIDDEN);
    }

    const message = await messageRepo.create(
      { text: content, channel_id: channelId, sender_id: userId },
      { include: { sender: { select: { id: true, name: true, email: true } } } }
    );

    if (messageInput.attachments?.length) {
      await AttachmentService.createMessageAttachments(message.id, 'CHANNEL', messageInput.attachments);
    }

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
      attachments: fullMessage.attachments.map((att: any) => ({
        ...att,
        file_url: StorageService.getFileUrl(att.file_url)
      }))
    };

    if (io) io.to(`channel:${channelId}`).emit('channel:message_created', messageData);
    return messageData;
  }
}
