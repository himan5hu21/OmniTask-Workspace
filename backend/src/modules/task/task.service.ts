import { taskRepository } from '@/repositories/task.repository';
import { boardListRepository } from '@/repositories/board-list.repository';

export class TaskService {
  async createTask(data: {
    title: string;
    list_id?: string;
    channel_id: string;
    org_id: string;
    creator_id: string;
  }) {
    return taskRepository.create(data);
  }

  async moveTask(taskId: string, targetListId: string, position: number) {
    return taskRepository.update(taskId, {
      list_id: targetListId,
      position,
    });
  }

  async getTaskById(id: string) {
    return taskRepository.getById(id, {
      include: {
        creator: {
          select: { id: true, name: true, avatar_url: true }
        },
        assignments: {
          include: {
            user: { select: { id: true, name: true, avatar_url: true } }
          }
        },
        labels: {
          include: { label: true }
        },
        checklists: {
          include: { items: { orderBy: { position: 'asc' } } },
          orderBy: { position: 'asc' }
        },
        attachments: {
          include: {
            user: { select: { id: true, name: true, avatar_url: true } }
          }
        },
        _count: {
          select: { comments: true }
        },
        subtasks: {
          select: { id: true, title: true, priority: true, status: true, position: true }
        }
      }
    });
  }

  async updateTask(id: string, data: any) {
    return taskRepository.update(id, data);
  }

  async getBoardData(channelId: string) {
    // Get all lists for the channel
    const lists = await boardListRepository.getAll({
      where: { channel_id: channelId },
      orderBy: { position: 'asc' },
      include: {
        tasks: {
          where: { deleted_at: null },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            priority: true,
            position: true,
            due_date: true,
            // Add other lightweight fields here later
          }
        }
      }
    });

    return { lists };
  }

  async createSubtask(parentId: string, data: { title: string; creator_id: string }) {
    const parent = await taskRepository.getById(parentId);
    if (!parent) throw new Error('Parent task not found');

    return taskRepository.create({
      ...data,
      parent_task_id: parentId,
      channel_id: parent.channel_id,
      org_id: parent.org_id,
      list_id: parent.list_id,
    });
  }
}

export const taskService = new TaskService();
