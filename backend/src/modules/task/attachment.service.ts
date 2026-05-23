import { attachmentRepository } from '@/repositories/attachment.repository';
import { activityService } from './activity.service';

export class AttachmentService {
  async addAttachment(
    taskId: string,
    userId: string,
    data: { name: string; url: string; file_type: string; file_size: number }
  ) {
    const result = await attachmentRepository.create({
      task_id: taskId,
      user_id: userId,
      file_name: data.name,
      file_url: data.url,
      mime_type: data.file_type,
      file_size: data.file_size,
    });

    activityService.logActivity(
      taskId,
      userId,
      'ATTACHMENT_ADDED',
      data.name
    ).catch((e) => console.error("[Activity]", e?.message ?? e));

    return result;
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

