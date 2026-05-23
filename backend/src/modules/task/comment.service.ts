import { commentRepository } from '@/repositories/comment.repository';
import { activityService } from './activity.service';

export class CommentService {
  async createComment(taskId: string, userId: string, content: string) {
    const comment = await commentRepository.create({
      task_id: taskId,
      user_id: userId,
      text: content,
    }, {
      include: {
        user: { select: { id: true, name: true, avatar_url: true } }
      }
    });

    activityService.logActivity(
      taskId,
      userId,
      'COMMENTED',
      content.length > 80 ? content.slice(0, 80) + '…' : content
    ).catch((e) => console.error("[Activity]", e?.message ?? e));

    return comment;
  }

  async getComments(taskId: string) {
    return commentRepository.getAll({
      where: { task_id: taskId },
      include: {
        user: { select: { id: true, name: true, avatar_url: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async deleteComment(commentId: string) {
    return commentRepository.delete(commentId);
  }
}

export const commentService = new CommentService();

