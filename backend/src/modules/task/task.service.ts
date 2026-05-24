import { taskRepository } from '@/repositories/task.repository';
import { boardListRepository } from '@/repositories/board-list.repository';
import { prisma } from '@/lib/database';
import { activityService } from './activity.service';

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
    const task = await taskRepository.create(data, this.getTaskIncludes());

    // Log creation activity
    activityService.logActivity(
      task.id,
      data.creator_id,
      'CREATED',
      `Created task "${data.title}"`
    ).catch((e) => console.error("[Activity]", e?.message ?? e));

    return task;
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

  /**
   * General-purpose task update. Caller passes actorId + updateType to drive
   * the activity log. Defaults to UPDATED if no type is provided.
   */
  async updateTask(
    id: string,
    data: any,
    activityMeta?: {
      actorId: string;
      type?: 'UPDATED' | 'STATUS_CHANGED' | 'PRIORITY_CHANGED' | 'DUE_DATE_CHANGED';
      content?: string | undefined;
    }
  ) {
    const result = await taskRepository.update(id, data, this.getTaskIncludes());

    if (activityMeta) {
      activityService.logActivity(
        id,
        activityMeta.actorId,
        activityMeta.type ?? 'UPDATED',
        activityMeta.content
      ).catch((e) => console.error("[Activity]", e?.message ?? e));
    }

    return result;
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

    const subtask = await taskRepository.create({
      ...data,
      parent_task_id: parentId,
      channel_id: parent.channel_id,
      org_id: parent.org_id,
      list_id: parent.list_id,
      position
    });

    // Log on the parent task
    activityService.logActivity(
      parentId,
      data.creator_id,
      'UPDATED',
      `Added subtask "${data.title}"`
    ).catch((e) => console.error("[Activity]", e?.message ?? e));

    return subtask;
  }

  /**
   * Aggregate all tasks/sub-items assigned to a user.
   * Supports optional org_id to scope to a single workspace.
   */
  async getMyTasks(userId: string, orgId?: string) {
    const orgFilter = orgId ? { org_id: orgId } : {};

    // 1. Tasks directly assigned to the user (top-level cards only)
    const directTasks = await prisma.task.findMany({
      where: {
        ...orgFilter,
        deleted_at: null,
        parent_task_id: null,
        assignments: { some: { user_id: userId } },
      },
      include: {
        assignments: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        checklists: { select: { id: true, name: true, _count: { select: { items: true } } } },
        _count: { select: { comments: true, subtasks: true } },
      },
      orderBy: [{ due_date: 'asc' }, { created_at: 'desc' }],
    });

    // 2. Top-level tasks where a subtask is assigned to the user
    const subtaskRows = await prisma.task.findMany({
      where: {
        deleted_at: null,
        parent_task_id: { not: null },
        assignments: { some: { user_id: userId } },
        ...(orgId ? { org_id: orgId } : {}),
      },
      include: {
        assignments: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        parent_task: { select: { id: true, title: true, org_id: true, channel_id: true, list_id: true, status: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ due_date: 'asc' }, { created_at: 'desc' }],
    });

    // 3. Checklists assigned to the user → attach parent task info
    const checklistRows = await prisma.taskChecklist.findMany({
      where: {
        assignee_id: userId,
        task: { deleted_at: null, ...(orgId ? { org_id: orgId } : {}) },
      },
      include: {
        task: {
          select: { id: true, title: true, org_id: true, channel_id: true, list_id: true, status: true, priority: true, due_date: true },
        },
        _count: { select: { items: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // 4. Checklist items assigned to the user → attach parent task info
    const checklistItemRows = await prisma.taskChecklistItem.findMany({
      where: {
        assignee_id: userId,
        checklist: {
          task: { deleted_at: null, ...(orgId ? { org_id: orgId } : {}) },
        },
      },
      include: {
        checklist: {
          include: {
            task: {
              select: { id: true, title: true, org_id: true, channel_id: true, list_id: true, status: true, priority: true, due_date: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      directTasks: directTasks.map((t: any) => ({ ...t, assignmentType: 'card' as const })),
      subtasks: subtaskRows.map((t: any) => ({ ...t, assignmentType: 'subtask' as const })),
      checklists: checklistRows.map((c: any) => ({ ...c, assignmentType: 'checklist' as const })),
      checklistItems: checklistItemRows.map((i: any) => ({ ...i, assignmentType: 'checklist_item' as const })),
    };
  }
}

export const taskService = new TaskService();

