import { taskRepository } from '@/repositories/task.repository';
import { boardListRepository } from '@/repositories/board-list.repository';
import { prisma } from '@/lib/database';


export class TaskService {
  private getBoardTaskSelect() {
    return {
      id: true,
      title: true,
      status: true,
      priority: true,
      position: true,
      list_id: true,
      channel_id: true,
      org_id: true,
      creator_id: true,
      created_at: true,
      updated_at: true,
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
    };
  }

  private getTaskIncludes() {
    return {
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
            assignee: { select: { id: true, name: true, avatar_url: true } },
            items: { 
              orderBy: [
                { position: 'asc' },
                { created_at: 'asc' },
                { id: 'asc' }
              ],
              include: {
                assignee: { select: { id: true, name: true, avatar_url: true } },
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
          orderBy: [
            { position: 'asc' },
            { created_at: 'asc' },
            { id: 'asc' }
          ]
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
          select: { 
            id: true, 
            title: true, 
            priority: true, 
            status: true, 
            position: true, 
            created_at: true,
            assignments: {
              include: {
                user: { select: { id: true, name: true, avatar_url: true } }
              }
            }
          },
          orderBy: [
            { position: 'asc' },
            { created_at: 'asc' },
            { id: 'asc' }
          ]
        }
      }
    };
  }

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
    return taskRepository.create(data, this.getTaskIncludes());
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
    return taskRepository.getById(id, this.getTaskIncludes());
  }

  async updateTask(id: string, data: any) {
    return taskRepository.update(id, data, this.getTaskIncludes());
  }

  async getBoardData(channelId: string) {
    const lists = await boardListRepository.getAll({
      where: { channel_id: channelId },
      orderBy: { position: 'asc' },
    });

    const listIds = lists.map((list: any) => list.id);
    const groupedCounts = listIds.length > 0
      ? await prisma.task.groupBy({
          by: ['list_id'],
          where: {
            list_id: { in: listIds },
            deleted_at: null,
            parent_task_id: null,
          },
          _count: {
            _all: true,
          },
        })
      : [];

    const taskCountByListId = new Map(
      groupedCounts.map((item) => [item.list_id, item._count._all])
    );

    return {
      lists: lists.map((list: any) => ({
        ...list,
        task_count: taskCountByListId.get(list.id) ?? 0,
      })),
    };
  }

  async getTasksByList(listId: string, page = 1, limit = 50) {
    const result = await taskRepository.getPaginated({
      page,
      limit,
      where: {
        list_id: listId,
        parent_task_id: null,
      },
      orderBy: [
        { position: 'asc' },
        { created_at: 'asc' },
        { id: 'asc' }
      ],
      select: this.getBoardTaskSelect(),
    });

    return {
      tasks: result.data,
      pagination: result.meta,
    };
  }

  async createSubtask(parentId: string, data: { title: string; creator_id: string }) {
    const parent = await taskRepository.getById(parentId);
    if (!parent) throw new Error('Parent task not found');

    // Get last subtask to calculate next position
    const lastSubtask = await taskRepository.findOne(
      { parent_task_id: parentId },
      { orderBy: { position: 'desc' } }
    );
    const position = lastSubtask ? lastSubtask.position + 1000 : 1000;

    return taskRepository.create({
      ...data,
      parent_task_id: parentId,
      channel_id: parent.channel_id,
      org_id: parent.org_id,
      list_id: parent.list_id,
      position
    });
  }
}

export const taskService = new TaskService();
