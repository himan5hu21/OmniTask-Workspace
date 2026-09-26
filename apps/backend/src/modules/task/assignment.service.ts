import { assignmentRepository } from '@/repositories/assignment.repository';
import { activityService } from './activity.service';

export class AssignmentService {
  async assignUser(taskId: string, userId: string, actorId: string, assigneeName?: string) {
    const result = await assignmentRepository.create({
      task_id: taskId,
      user_id: userId,
    }, {
      include: {
        user: { select: { id: true, name: true, avatar_url: true } }
      }
    });

    // Fire-and-forget activity log
    activityService.logActivity(
      taskId,
      actorId,
      'ASSIGNED',
      assigneeName ? `Assigned to ${assigneeName}` : undefined
    ).catch((e) => console.error("[Activity]", e?.message ?? e));

    return result;
  }

  async unassignUser(taskId: string, userId: string, actorId: string, assigneeName?: string) {
    const result = await assignmentRepository.deleteMany({
      where: {
        task_id: taskId,
        user_id: userId,
      }
    });

    activityService.logActivity(
      taskId,
      actorId,
      'UNASSIGNED',
      assigneeName ? `Removed ${assigneeName}` : undefined
    ).catch((e) => console.error("[Activity]", e?.message ?? e));

    return result;
  }
}

export const assignmentService = new AssignmentService();

