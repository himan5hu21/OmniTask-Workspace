import { activityRepository } from '@/repositories/activity.repository';

export type TaskActivityType =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'ASSIGNED'
  | 'UNASSIGNED'
  | 'COMMENTED'
  | 'CHECKLIST_UPDATED'
  | 'ATTACHMENT_ADDED'
  | 'LABEL_ADDED'
  | 'LABEL_REMOVED'
  | 'PRIORITY_CHANGED'
  | 'DUE_DATE_CHANGED'
  | 'DELETED';

export class ActivityService {
  /**
   * Log a task activity entry.
   */
  async logActivity(
    taskId: string,
    userId: string,
    type: TaskActivityType,
    content?: string
  ) {
    const activity = await activityRepository.create(
      {
        task_id: taskId,
        user_id: userId,
        type,
        content: content ?? null,
      },
      {
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
      }
    );

    // Broadcast in real-time if Socket.IO is initialized
    try {
      const { socketIO } = await import('@/plugins/socket');
      if (socketIO) {
        const { prisma: db } = await import('@/lib/database');
        const task = await db.task.findUnique({
          where: { id: taskId },
          select: { channel_id: true }
        });
        if (task?.channel_id) {
          socketIO.to(`channel:${task.channel_id}`).emit('channel:task_activity_created', {
            channelId: task.channel_id,
            taskId,
            actorUserId: userId,
            timestamp: activity.created_at.toISOString(),
            activity,
          });
        }
      }
    } catch (e: any) {
      console.error('[Activity Socket Broadcast Error]', e?.message ?? e);
    }

    return activity;
  }

  /**
   * Get paginated activity feed for a task (most recent first).
   */
  async getActivities(
    taskId: string,
    page: number = 1,
    limit: number = 50
  ) {
    return activityRepository.getPaginated({
      page,
      limit,
      where: { task_id: taskId },
      include: {
        user: { select: { id: true, name: true, avatar_url: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get a single activity entry by ID.
   */
  async getActivityById(activityId: string) {
    return activityRepository.getById(activityId, {
      include: {
        user: { select: { id: true, name: true, avatar_url: true } },
      },
    });
  }

  /**
   * Hard-delete an activity log entry (admin / cleanup use-case).
   */
  async deleteActivity(activityId: string) {
    return activityRepository.hardDelete(activityId);
  }
}

export const activityService = new ActivityService();
