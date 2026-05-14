import { taskRepository } from '@/repositories/task.repository';
import { boardListRepository } from '@/repositories/board-list.repository';


export class TaskService {
  async createTask(data: {
    title: string;
    list_id: string;
    channel_id: string;
    org_id: string;
    creator_id: string;
    position?: number;
  }) {
    if (data.position === undefined) {
      const lastTask = await taskRepository.findOne(
        { list_id: data.list_id },
        { orderBy: { position: 'desc' } }
      );
      data.position = lastTask ? lastTask.position + 1000 : 1000;
    }
    return taskRepository.create(data);
  }

  async moveTask(taskId: string, targetListId: string, position: number) {
    const updated = await taskRepository.update(taskId, {
      list_id: targetListId,
      position,
    });

    // Normalize when gaps become too small
    const tasks = await taskRepository.getAll({
      where: { list_id: targetListId },
      orderBy: { position: 'asc' },
    });

    let shouldNormalize = false;
    for (let i = 1; i < tasks.length; i++) {
      const gap = tasks[i].position - tasks[i - 1].position;
      if (gap <= 1) {
        shouldNormalize = true;
        break;
      }
    }

    if (shouldNormalize) {
      await this.normalizeListPositions(targetListId);
    }

    return updated;
  }

  async normalizeListPositions(listId: string) {
    const tasks = await taskRepository.getAll({
      where: { list_id: listId },
      orderBy: { position: 'asc' },
    });

    await Promise.all(
      tasks.map((task: any, index: number) =>
        taskRepository.update(task.id, {
          position: (index + 1) * 1000,
        } as any)
      )
    );
  }

  async deleteTask(id: string) {
    return taskRepository.hardDelete(id);
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
          include: { 
            items: { 
              orderBy: { position: 'asc' },
              include: {
                subtask: {
                  include: {
                    assignments: {
                      include: {
                        user: { select: { id: true, name: true, avatar_url: true } }
                      }
                    }
                  }
                }
              }
            } 
          },
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
          select: { id: true, title: true, priority: true, status: true, position: true },
          orderBy: { position: 'asc' }
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
          where: { 
            deleted_at: null,
            parent_task_id: null 
          },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            position: true,
            start_date: true,
            due_date: true,
            completed_at: true,
            assignments: {
              include: {
                user: { select: { id: true, name: true, avatar_url: true } }
              }
            },
            _count: {
              select: { comments: true }
            }
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
