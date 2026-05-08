import { attachmentRepository } from '@/repositories/attachment.repository';

export class AttachmentService {
  async addAttachment(taskId: string, userId: string, data: { name: string; url: string; file_type: string; file_size: number }) {
    return attachmentRepository.create({
      task_id: taskId,
      user_id: userId,
      file_name: data.name,
      file_url: data.url,
      mime_type: data.file_type,
      file_size: data.file_size,
    });
  }

  async getAttachments(taskId: string) {
    return attachmentRepository.getAll({
      where: { task_id: taskId },
      orderBy: { created_at: 'desc' }
    });
  }

  async deleteAttachment(attachmentId: string) {
    return attachmentRepository.delete(attachmentId);
  }
}

export const attachmentService = new AttachmentService();
