import { prisma } from '@/lib/database';
import { MessageAttachmentType } from '@/generated/prisma/client';

export interface AttachmentData {
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  type?: MessageAttachmentType;
}

export class AttachmentService {
  /**
   * Helper to determine attachment type from mime type
   */
  static getAttachmentType(mimeType: string): MessageAttachmentType {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return 'DOCUMENT';
    return 'FILE';
  }

  /**
   * Create message attachments
   */
  static async createMessageAttachments(
    messageId: string, 
    type: 'CHANNEL' | 'DIRECT', 
    attachments: AttachmentData[]
  ) {
    if (!attachments.length) return [];

    const data = attachments.map(att => ({
      file_name: att.file_name,
      file_url: att.file_url,
      file_size: att.file_size,
      mime_type: att.mime_type,
      type: att.type || this.getAttachmentType(att.mime_type),
      [type === 'CHANNEL' ? 'channel_message_id' : 'direct_message_id']: messageId
    }));

    return prisma.messageAttachment.createMany({
      data
    });
  }

  /**
   * Create task attachments
   */
  static async createTaskAttachments(
    taskId: string,
    userId: string,
    attachments: AttachmentData[]
  ) {
    if (!attachments.length) return [];

    const data = attachments.map(att => ({
      task_id: taskId,
      user_id: userId,
      file_name: att.file_name,
      file_url: att.file_url,
      file_size: att.file_size,
      mime_type: att.mime_type,
    }));

    return prisma.taskAttachment.createMany({
      data
    });
  }
}
