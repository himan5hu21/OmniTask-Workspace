import { assignmentRepository } from '@/repositories/assignment.repository';
import { AssignmentRole } from '../../../prisma/generated/prisma/client';

export class AssignmentService {
  async assignUser(taskId: string, userId: string, role: AssignmentRole = AssignmentRole.ASSIGNEE) {
    return assignmentRepository.create({
      task_id: taskId,
      user_id: userId,
      role,
    }, {
      include: {
        user: { select: { id: true, name: true, avatar_url: true } }
      }
    });
  }

  async unassignUser(taskId: string, userId: string) {
    return assignmentRepository.deleteMany({
      where: {
        task_id: taskId,
        user_id: userId,
      }
    });
  }
}

export const assignmentService = new AssignmentService();
