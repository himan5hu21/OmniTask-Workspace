// src/services/message.service.ts
import { BaseRepository } from '@/respositories/base.repository';
import { AppError } from '@/utils/AppError';

const messageRepo = new BaseRepository('channelMessage');
const channelRepo = new BaseRepository('channel');
const channelMemberRepo = new BaseRepository('channelMember');

export class MessageService {
  // Get messages in a channel
  static async getChannelMessages(channelId: string, userId: string) {
    // Check if user is member of the channel
    const membership = await channelMemberRepo.findOne({
      channel_id: channelId,
      user_id: userId
    });

    if (!membership) {
      throw new AppError('Access denied to this channel', 403);
    }

    // Get channel name
    const channel = await channelRepo.getById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    // Get messages with sender information
    const messages = await messageRepo.getAll({
      where: { channel_id: channelId },
      include: {
        sender: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    return {
      messages: messages.map((msg: any) => ({
        id: msg.id,
        content: msg.text,
        user_id: msg.sender_id,
        user_name: msg.sender.name,
        created_at: msg.created_at
      })),
      channelName: channel.name
    };
  }

  // Create message in a channel
  static async createMessage(messageData: { content: string }, channelId: string, userId: string) {
    const { content } = messageData;

    // Check if user is member of the channel
    const membership = await channelMemberRepo.findOne({
      channel_id: channelId,
      user_id: userId
    });

    if (!membership) {
      throw new AppError('Access denied to this channel', 403);
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

    return {
      id: message.id,
      content: message.text,
      user_id: message.sender_id,
      user_name: message.sender.name,
      created_at: message.created_at
    };
  }
}
