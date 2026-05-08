import { commentRepository } from '@/repositories/comment.repository';

export class CommentService {
  async createComment(taskId: string, userId: string, content: string) {
    return commentRepository.create({
      task_id: taskId,
      user_id: userId,
      text: content,
    }, {
      include: {
        user: { select: { id: true, name: true, avatar_url: true } }
      }
    });
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
