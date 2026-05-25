// src/services/message.service.ts
import { BaseRepository } from '@/repositories/base.repository';
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';
import type { Server } from 'socket.io';
import { AttachmentService, AttachmentData } from '@/modules/attachment/attachment.service';
import { PermissionGuard } from '@/utils/permissions';
import { StorageService } from '@/lib/storage';
import { prisma } from '@/lib/database';
import { NotificationService } from '@/modules/notification/notification.service';

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
        sender: { select: { id: true, name: true, email: true, avatar_url: true } },
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
        user_avatar: msg.sender.avatar_url ? StorageService.getFileUrl(msg.sender.avatar_url) : undefined,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
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
      { include: { sender: { select: { id: true, name: true, email: true, avatar_url: true } } } }
    );
 
    if (messageInput.attachments?.length) {
      await AttachmentService.createMessageAttachments(message.id, 'CHANNEL', messageInput.attachments);
    }
 
    const fullMessage = await messageRepo.findOne(
      { id: message.id },
      {
        include: {
          sender: { select: { id: true, name: true, email: true, avatar_url: true } },
          attachments: true
        }
      }
    );
 
    const messageData = {
      id: fullMessage.id,
      content: fullMessage.text,
      channel_id: fullMessage.channel_id,
      user_id: fullMessage.sender_id,
      user_name: fullMessage.sender.name,
      user_avatar: fullMessage.sender.avatar_url ? StorageService.getFileUrl(fullMessage.sender.avatar_url) : undefined,
      created_at: fullMessage.created_at,
      updated_at: fullMessage.updated_at,
      attachments: fullMessage.attachments.map((att: any) => ({
        ...att,
        file_url: StorageService.getFileUrl(att.file_url)
      }))
    };
 
      if (io) {
        io.to(`channel:${channelId}`).emit('channel:message_created', messageData);

        // Emit to all channel members' private rooms for sidebar unread badge support
        try {
        const members = await channelMemberRepo.getAll({ where: { channel_id: channelId } });
        for (const member of members) {
          io.to(`user:${member.user_id}`).emit('channel:message_created', messageData);
        }
        } catch (err) {
          console.error('[Socket] Failed to broadcast channel message to members:', err);
        }
      }

      const mentionedUserIds = NotificationService.extractMentionedUserIds(content);
      if (mentionedUserIds.length > 0) {
        const memberships = await prisma.channelMember.findMany({
          where: {
            channel_id: channelId,
            user_id: {
              in: mentionedUserIds.filter((mentionedUserId) => mentionedUserId !== userId),
            },
          },
          select: { user_id: true },
        });

        await Promise.all(
          memberships.map((membership) =>
            NotificationService.create({
              userId: membership.user_id,
              orgId: channel.org_id,
              actorUserId: userId,
              type: 'CHANNEL_MESSAGE_MENTION',
              entityType: 'CHANNEL',
              entityId: channelId,
              title: `Mentioned in #${channel.name}`,
              body: `${fullMessage.sender.name} mentioned you in #${channel.name}`,
              metadata: {
                channelId,
                channelName: channel.name,
                messageId: fullMessage.id,
              },
            }, io)
          )
        );
      }

      return messageData;
    }

  // Edit a message
  static async editMessage(messageId: string, content: string, userId: string, io?: Server) {
    const message = await messageRepo.getById(messageId);
    if (!message) throw new AppError('Message not found', HttpStatus.NOT_FOUND);

    // Sender verification
    if (message.sender_id !== userId) {
      throw new AppError('You can only edit your own messages', HttpStatus.FORBIDDEN);
    }

    // Enforce 5 minute editing limit
    const diff = new Date().getTime() - new Date(message.created_at).getTime();
    if (diff > 5 * 60 * 1000) {
      throw new AppError('Editing time limit exceeded (5 minutes max)', HttpStatus.BAD_REQUEST);
    }

    await messageRepo.update(
      messageId,
      { text: content, updated_at: new Date() }
    );

    const fullMessage = await messageRepo.findOne(
      { id: messageId },
      {
        include: {
          sender: { select: { id: true, name: true, email: true, avatar_url: true } },
          attachments: true
        }
      }
    );

    const messageData = {
      id: fullMessage.id,
      content: fullMessage.text,
      channel_id: fullMessage.channel_id,
      user_id: fullMessage.sender_id,
      user_name: fullMessage.sender.name,
      user_avatar: fullMessage.sender.avatar_url ? StorageService.getFileUrl(fullMessage.sender.avatar_url) : undefined,
      created_at: fullMessage.created_at,
      updated_at: fullMessage.updated_at,
      attachments: fullMessage.attachments.map((att: any) => ({
        ...att,
        file_url: StorageService.getFileUrl(att.file_url)
      }))
    };

    if (io) io.to(`channel:${fullMessage.channel_id}`).emit('channel:message_updated', messageData);
    return messageData;
  }

  // Delete a message
  static async deleteMessage(messageId: string, userId: string, io?: Server) {
    const message = await messageRepo.getById(messageId);
    if (!message) throw new AppError('Message not found', HttpStatus.NOT_FOUND);

    // Sender verification
    if (message.sender_id !== userId) {
      throw new AppError('You can only delete your own messages', HttpStatus.FORBIDDEN);
    }

    // Enforce 5 minute deletion limit
    const diff = new Date().getTime() - new Date(message.created_at).getTime();
    if (diff > 5 * 60 * 1000) {
      throw new AppError('Deleting time limit exceeded (5 minutes max)', HttpStatus.BAD_REQUEST);
    }

    // Fetch and delete physical message attachment files
    try {
      const { prisma: db } = await import('@/lib/database');
      const attachments = await db.messageAttachment.findMany({
        where: { channel_message_id: messageId }
      });
      for (const attachment of attachments) {
        await StorageService.deleteFile(attachment.file_url);
      }
    } catch (e: any) {
      console.error('[Delete Message Attachments Error]', e?.message ?? e);
    }

    await messageRepo.delete(messageId);

    if (io) io.to(`channel:${message.channel_id}`).emit('channel:message_deleted', { id: messageId });
    return { id: messageId };
  }

  // Delete a single message attachment
  static async deleteAttachment(attachmentId: string, userId: string, io?: Server) {
    const { prisma: db } = await import('@/lib/database');

    const attachment = await db.messageAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        channel_message: true,
        direct_message: true,
      },
    });

    if (!attachment) {
      throw new AppError('Attachment not found', HttpStatus.NOT_FOUND);
    }

    const message = attachment.channel_message ?? attachment.direct_message;
    if (!message) {
      throw new AppError('Parent message not found', HttpStatus.NOT_FOUND);
    }

    // Sender verification
    if (message.sender_id !== userId) {
      throw new AppError('You can only delete attachments on your own messages', HttpStatus.FORBIDDEN);
    }

    // Enforce 5 minute deletion limit
    const diff = new Date().getTime() - new Date(message.created_at).getTime();
    if (diff > 5 * 60 * 1000) {
      throw new AppError('Deleting time limit exceeded (5 minutes max)', HttpStatus.BAD_REQUEST);
    }

    // Delete physical file
    await StorageService.deleteFile(attachment.file_url);

    // Delete database record
    await db.messageAttachment.delete({
      where: { id: attachmentId },
    });

    let messageData = null;
    if (attachment.channel_message_id) {
      const fullMessage = await messageRepo.findOne(
        { id: attachment.channel_message_id },
        {
          include: {
            sender: { select: { id: true, name: true, email: true, avatar_url: true } },
            attachments: true,
          },
        }
      );

      if (fullMessage) {
        messageData = {
          id: fullMessage.id,
          content: fullMessage.text,
          channel_id: fullMessage.channel_id,
          user_id: fullMessage.sender_id,
          user_name: fullMessage.sender.name,
          user_avatar: fullMessage.sender.avatar_url ? StorageService.getFileUrl(fullMessage.sender.avatar_url) : undefined,
          created_at: fullMessage.created_at,
          updated_at: fullMessage.updated_at,
          attachments: fullMessage.attachments.map((att: any) => ({
            ...att,
            file_url: StorageService.getFileUrl(att.file_url),
          })),
        };

        if (io) {
          io.to(`channel:${fullMessage.channel_id}`).emit('channel:message_updated', messageData);
        }
      }
    }

    return { id: attachmentId, messageId: message.id, message: messageData };
  }

  // ==========================================
  // DIRECT MESSAGING (DM) METHODS
  // ==========================================

  // Get or Create a Direct Conversation between two users
  static async getOrCreateConversation(userId1: string, userId2: string) {
    if (userId1 === userId2) {
      throw new AppError('Cannot start a direct conversation with yourself', HttpStatus.BAD_REQUEST);
    }

    // Ensure both users share at least one common organization (Slack-like security isolation)
    const sharedOrg = await prisma.organizationMember.findFirst({
      where: {
        user_id: userId1,
        organization: {
          members: {
            some: {
              user_id: userId2
            }
          }
        }
      }
    });

    if (!sharedOrg) {
      throw new AppError('You can only direct message members of your organizations', HttpStatus.FORBIDDEN);
    }

    // Sort IDs alphabetically to comply with the database unique constraint @@unique([user1_id, user2_id])
    const [u1, u2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

    // Find active conversation
    let conversation = await prisma.directConversation.findUnique({
      where: {
        user1_id_user2_id: {
          user1_id: u1,
          user2_id: u2
        }
      },
      include: {
        user1: { select: { id: true, name: true, email: true, avatar_url: true } },
        user2: { select: { id: true, name: true, email: true, avatar_url: true } }
      }
    });

    if (!conversation) {
      // Create new conversation
      conversation = await prisma.directConversation.create({
        data: {
          user1_id: u1,
          user2_id: u2
        },
        include: {
          user1: { select: { id: true, name: true, email: true, avatar_url: true } },
          user2: { select: { id: true, name: true, email: true, avatar_url: true } }
        }
      });
    }

    // Determine other user details
    const otherUser = conversation.user1.id === userId1 ? conversation.user2 : conversation.user1;

    return {
      id: conversation.id,
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        email: otherUser.email,
        avatar_url: otherUser.avatar_url ? StorageService.getFileUrl(otherUser.avatar_url) : null
      }
    };
  }

  // Get all Direct Conversations for a user, including last message preview
  static async getUserConversations(userId: string) {
    const conversations = await prisma.directConversation.findMany({
      where: {
        OR: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, email: true, avatar_url: true } },
        user2: { select: { id: true, name: true, email: true, avatar_url: true } },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true } } }
        },
        _count: {
          select: {
            messages: {
              where: {
                sender_id: { not: userId },
                is_read: false
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return conversations.map((conv: any) => {
      const otherUser = conv.user1.id === userId ? conv.user2 : conv.user1;
      const lastMessage = conv.messages[0] || null;

      return {
        id: conv.id,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name,
          email: otherUser.email,
          avatar_url: otherUser.avatar_url ? StorageService.getFileUrl(otherUser.avatar_url) : null
        },
        unreadCount: conv._count.messages,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.text,
              sender_id: lastMessage.sender_id,
              sender_name: lastMessage.sender.name,
              created_at: lastMessage.created_at,
              is_read: lastMessage.is_read
            }
          : null
      };
    });
  }

  // Get direct messages in a conversation
  static async getDirectMessages(
    conversationId: string,
    userId: string,
    options: { page?: number; limit?: number } | undefined = {}
  ) {
    const { page = 1, limit = 20 } = options;

    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) throw new AppError('Conversation not found', HttpStatus.NOT_FOUND);

    // Security: User must be part of the conversation
    if (conversation.user1_id !== userId && conversation.user2_id !== userId) {
      throw new AppError('Unauthorized access to this conversation', HttpStatus.FORBIDDEN);
    }

    const skip = (page - 1) * limit;

    const [paginatedMessages, total] = await Promise.all([
      prisma.directMessage.findMany({
        where: { conversation_id: conversationId },
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, name: true, email: true, avatar_url: true } },
          attachments: true
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.directMessage.count({
        where: { conversation_id: conversationId }
      })
    ]);

    const messages = [...paginatedMessages].reverse();

    // Mark recipient's messages as read
    await prisma.directMessage.updateMany({
      where: {
        conversation_id: conversationId,
        sender_id: { not: userId },
        is_read: false
      },
      data: { is_read: true }
    });

    const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { name: true }
    });

    return {
      messages: messages.map((msg: any) => ({
        id: msg.id,
        content: msg.text,
        user_id: msg.sender_id,
        user_name: msg.sender.name,
        user_avatar: msg.sender.avatar_url ? StorageService.getFileUrl(msg.sender.avatar_url) : undefined,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        attachments: msg.attachments.map((att: any) => ({
          ...att,
          file_url: StorageService.getFileUrl(att.file_url)
        }))
      })),
      otherUserName: otherUser?.name || 'Direct Message',
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit)
      }
    };
  }

  // Create direct message in a conversation
  static async createDirectMessage(
    messageInput: { content?: string | undefined; attachments?: AttachmentData[] | undefined },
    conversationId: string,
    senderId: string,
    io?: Server
  ) {
    const { content } = messageInput;

    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) throw new AppError('Conversation not found', HttpStatus.NOT_FOUND);

    // Security Check: Sender must be part of conversation
    if (conversation.user1_id !== senderId && conversation.user2_id !== senderId) {
      throw new AppError('Unauthorized access to this conversation', HttpStatus.FORBIDDEN);
    }

    const message = await prisma.directMessage.create({
      data: { text: content ?? null, conversation_id: conversationId, sender_id: senderId },
      include: { sender: { select: { id: true, name: true, email: true, avatar_url: true } } }
    });

    if (messageInput.attachments?.length) {
      await AttachmentService.createMessageAttachments(message.id, 'DIRECT', messageInput.attachments);
    }

    const fullMessage = await prisma.directMessage.findUnique({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar_url: true } },
        attachments: true
      }
    });

    if (!fullMessage) throw new AppError('Message creation failed', HttpStatus.INTERNAL_SERVER_ERROR);

    const messageData = {
      id: fullMessage.id,
      content: fullMessage.text,
      conversation_id: fullMessage.conversation_id,
      user_id: fullMessage.sender_id,
      user_name: fullMessage.sender.name,
      user_avatar: fullMessage.sender.avatar_url ? StorageService.getFileUrl(fullMessage.sender.avatar_url) : undefined,
      created_at: fullMessage.created_at,
      updated_at: fullMessage.updated_at,
      attachments: fullMessage.attachments.map((att: any) => ({
        ...att,
        file_url: StorageService.getFileUrl(att.file_url)
      }))
    };

      // Socket.io Real-time Propagation (Emit to both users' private notification rooms)
      if (io) {
        io.to(`user:${conversation.user1_id}`).emit('dm:message_created', messageData);
        io.to(`user:${conversation.user2_id}`).emit('dm:message_created', messageData);
      }

      return messageData;
    }

  // Edit a direct message
  static async editDirectMessage(messageId: string, content: string, userId: string, io?: Server) {
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: { conversation: true }
    });

    if (!message) throw new AppError('Message not found', HttpStatus.NOT_FOUND);

    // Sender verification
    if (message.sender_id !== userId) {
      throw new AppError('You can only edit your own messages', HttpStatus.FORBIDDEN);
    }

    // Enforce 5 minute editing limit
    const diff = new Date().getTime() - new Date(message.created_at).getTime();
    if (diff > 5 * 60 * 1000) {
      throw new AppError('Editing time limit exceeded (5 minutes max)', HttpStatus.BAD_REQUEST);
    }

    await prisma.directMessage.update({
      where: { id: messageId },
      data: { text: content, updated_at: new Date() }
    });

    const fullMessage = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, email: true, avatar_url: true } },
        attachments: true
      }
    });

    if (!fullMessage) throw new AppError('Failed to retrieve updated message', HttpStatus.INTERNAL_SERVER_ERROR);

    const messageData = {
      id: fullMessage.id,
      content: fullMessage.text,
      conversation_id: fullMessage.conversation_id,
      user_id: fullMessage.sender_id,
      user_name: fullMessage.sender.name,
      user_avatar: fullMessage.sender.avatar_url ? StorageService.getFileUrl(fullMessage.sender.avatar_url) : undefined,
      created_at: fullMessage.created_at,
      updated_at: fullMessage.updated_at,
      attachments: fullMessage.attachments.map((att: any) => ({
        ...att,
        file_url: StorageService.getFileUrl(att.file_url)
      }))
    };

    if (io) {
      io.to(`user:${message.conversation.user1_id}`).emit('dm:message_updated', messageData);
      io.to(`user:${message.conversation.user2_id}`).emit('dm:message_updated', messageData);
    }

    return messageData;
  }

  // Delete a direct message
  static async deleteDirectMessage(messageId: string, userId: string, io?: Server) {
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: { conversation: true }
    });

    if (!message) throw new AppError('Message not found', HttpStatus.NOT_FOUND);

    // Sender verification
    if (message.sender_id !== userId) {
      throw new AppError('You can only delete your own messages', HttpStatus.FORBIDDEN);
    }

    // Enforce 5 minute deletion limit
    const diff = new Date().getTime() - new Date(message.created_at).getTime();
    if (diff > 5 * 60 * 1000) {
      throw new AppError('Deleting time limit exceeded (5 minutes max)', HttpStatus.BAD_REQUEST);
    }

    // Fetch and delete physical message attachment files
    try {
      const attachments = await prisma.messageAttachment.findMany({
        where: { direct_message_id: messageId }
      });
      for (const attachment of attachments) {
        await StorageService.deleteFile(attachment.file_url);
      }
    } catch (e: any) {
      console.error('[Delete DM Attachments Error]', e?.message ?? e);
    }

    await prisma.directMessage.delete({
      where: { id: messageId }
    });

    if (io) {
      const deleteData = { id: messageId, conversation_id: message.conversation_id };
      io.to(`user:${message.conversation.user1_id}`).emit('dm:message_deleted', deleteData);
      io.to(`user:${message.conversation.user2_id}`).emit('dm:message_deleted', deleteData);
    }

    return { id: messageId };
  }
}
