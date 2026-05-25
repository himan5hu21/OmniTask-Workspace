// Task management controller
import { FastifyReply, FastifyRequest } from 'fastify';
import { taskService } from './task.service';
import { boardListService } from './board-list.service';
import { assignmentService } from './assignment.service';
import { commentService } from './comment.service';
import { checklistService } from './checklist.service';
import { labelService } from './label.service';
import { attachmentService } from './attachment.service';
import { activityService } from './activity.service';
import { sendSuccess, sendError } from '@/utils/response';
import { PermissionGuard } from '@/utils/permissions';
import { HttpStatus } from '@/types/api';
import { boardListRepository } from '@/repositories/board-list.repository';
import { organizationMemberRepository } from '@/repositories/organization-member.repository';
import { channelMemberRepository } from '@/repositories/channel-member.repository';
import { checklistRepository } from '@/repositories/checklist.repository';
import { checklistItemRepository } from '@/repositories/checklist-item.repository';
import { channelRepository } from '@/repositories/channel.repository';
import { taskRepository } from '@/repositories/task.repository';
import { attachmentRepository } from '@/repositories/attachment.repository';
import { commentRepository } from '@/repositories/comment.repository';
import { labelRepository } from '@/repositories/label.repository';
import { activityRepository } from '@/repositories/activity.repository';
import { StorageService } from '@/lib/storage';
import { NotificationService } from '@/modules/notification/notification.service';

export class TaskController {
  constructor() {
    this.createBoardList = this.createBoardList.bind(this);
    this.getBoard = this.getBoard.bind(this);
    this.getBoardListTasks = this.getBoardListTasks.bind(this);
    this.createTask = this.createTask.bind(this);
    this.moveTask = this.moveTask.bind(this);
    this.reorderLists = this.reorderLists.bind(this);
    this.updateBoardList = this.updateBoardList.bind(this);
    this.deleteBoardList = this.deleteBoardList.bind(this);
    this.getTask = this.getTask.bind(this);
    this.updateTaskContent = this.updateTaskContent.bind(this);
    this.updateTaskStatus = this.updateTaskStatus.bind(this);
    this.updateTaskManage = this.updateTaskManage.bind(this);
    this.assignUser = this.assignUser.bind(this);
    this.unassignUser = this.unassignUser.bind(this);
    this.createComment = this.createComment.bind(this);
    this.getComments = this.getComments.bind(this);
    this.createChecklist = this.createChecklist.bind(this);
    this.addChecklistItem = this.addChecklistItem.bind(this);
    this.updateChecklistItem = this.updateChecklistItem.bind(this);
    this.createLabel = this.createLabel.bind(this);
    this.deleteLabel = this.deleteLabel.bind(this);
    this.assignLabel = this.assignLabel.bind(this);
    this.addAttachment = this.addAttachment.bind(this);
    this.createSubtask = this.createSubtask.bind(this);
    this.deleteTask = this.deleteTask.bind(this);
    this.getActivities = this.getActivities.bind(this);
    this.deleteActivity = this.deleteActivity.bind(this);
    this.getMyTasks = this.getMyTasks.bind(this);
  }

  private emitTaskRefresh(
    request: FastifyRequest,
    channelId: string,
    payload: {
      scope: 'board' | 'task' | 'comments' | 'task+comments';
      taskId?: string;
      parentTaskId?: string;
      listId?: string;
      reason: string;
    }
  ) {
    request.server.io?.to(`channel:${channelId}`).emit('channel:task_refresh', {
      channelId,
      ...payload,
      actorUserId: (request.user as any).userId,
      timestamp: new Date().toISOString(),
    });
  }

  private emitTaskDeleted(
    request: FastifyRequest,
    channelId: string,
    payload: { taskId: string; listId?: string; parentTaskId?: string }
  ) {
    request.server.io?.to(`channel:${channelId}`).emit('channel:task_deleted', {
      channelId,
      ...payload,
      actorUserId: (request.user as any).userId,
      timestamp: new Date().toISOString(),
    });
  }

  private emitTaskMoved(
    request: FastifyRequest,
    channelId: string,
    payload: { taskId: string; sourceListId: string; targetListId: string; position: number }
  ) {
    request.server.io?.to(`channel:${channelId}`).emit('channel:task_moved', {
      channelId,
      ...payload,
      actorUserId: (request.user as any).userId,
      timestamp: new Date().toISOString(),
    });
  }

  private emitBoardListsReordered(
    request: FastifyRequest,
    channelId: string,
    items: { id: string; position: number }[]
  ) {
    request.server.io?.to(`channel:${channelId}`).emit('channel:board_lists_reordered', {
      channelId,
      items,
      actorUserId: (request.user as any).userId,
      timestamp: new Date().toISOString(),
    });
  }

  private normalizeStorageUrls<T>(payload: T): T {
    if (Array.isArray(payload)) {
      return payload.map((item) => this.normalizeStorageUrls(item)) as T;
    }

    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if ((key === 'avatar_url' || key === 'file_url') && typeof value === 'string') {
        (payload as Record<string, unknown>)[key] = StorageService.getFileUrl(value);
        continue;
      }

      if (value && typeof value === 'object') {
        (payload as Record<string, unknown>)[key] = this.normalizeStorageUrls(value);
      }
    }

    return payload;
  }

  // 1. Create Board List
  async createBoardList(
    request: FastifyRequest<{ Body: { channel_id: string; name: string; position: number } }>,
    reply: FastifyReply
  ) {
    const { channel_id } = request.body;

    // Check if channel exists
    const channel = await channelRepository.getById(channel_id);
    if (!channel) return sendError(reply, HttpStatus.NOT_FOUND, 'Channel not found');

    const orgId = channel.org_id;

    // Fetch roles
    const [orgMembership, channelMembership] = await Promise.all([
      organizationMemberRepository.getMember(orgId, (request.user as any).userId),
      channelMemberRepository.getMember(channel_id, (request.user as any).userId)
    ]);

    const orgRole = orgMembership?.role;
    const channelRole = channelMembership?.role;

    if (!PermissionGuard.canChannel(orgRole, channelRole, 'board.list.create')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to create board list');
    }

    const list = await boardListService.createList(request.body);
    this.emitTaskRefresh(request, channel_id, {
      scope: 'board',
      listId: list.id,
      reason: 'board_list_created',
    });
    return sendSuccess(reply, list, 'CREATE');
  }

  // 2. Get Full Board
  async getBoard(
    request: FastifyRequest<{ Params: { channelId: string } }>,
    reply: FastifyReply
  ) {
    const { channelId } = request.params;

    // Check if channel exists
    const channel = await channelRepository.getById(channelId);
    if (!channel) return sendError(reply, HttpStatus.NOT_FOUND, 'Channel not found');

    const orgId = channel.org_id;

    // Fetch roles
    const [orgMembership, channelMembership] = await Promise.all([
      organizationMemberRepository.getMember(orgId, (request.user as any).userId),
      channelMemberRepository.getMember(channelId, (request.user as any).userId)
    ]);

    const orgRole = orgMembership?.role;
    const channelRole = channelMembership?.role;

    if (!PermissionGuard.canChannel(orgRole, channelRole, 'task.view')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to view board');
    }

    const board = await taskService.getBoardData(channelId);
    return sendSuccess(reply, board, 'FETCH');
  }

  async getBoardListTasks(
    request: FastifyRequest<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const page = Number(request.query.page ?? 1);
    const limit = Number(request.query.limit ?? 50);
    const userId = (request.user as any).userId;

    const list = await boardListRepository.getById(id);
    if (!list) return sendError(reply, HttpStatus.NOT_FOUND, 'List not found');

    const channel = await channelRepository.getById(list.channel_id);
    if (!channel) return sendError(reply, HttpStatus.NOT_FOUND, 'Channel not found');

    const [orgMembership, channelMembership] = await Promise.all([
      organizationMemberRepository.getMember(channel.org_id, userId),
      channelMemberRepository.getMember(list.channel_id, userId)
    ]);

    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.view')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to view list tasks');
    }

    const tasks = this.normalizeStorageUrls(await taskService.getTasksByList(id, page, limit));
    return sendSuccess(reply, tasks, 'FETCH');
  }

  // 2.1 Update Board List
  async updateBoardList(
    request: FastifyRequest<{ Params: { id: string }; Body: { name?: string; position?: number } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;

    const list = await boardListRepository.getById(id);
    if (!list) return sendError(reply, HttpStatus.NOT_FOUND, 'List not found');

    const channel = await channelRepository.getById(list.channel_id);
    if (!channel) return sendError(reply, HttpStatus.NOT_FOUND, 'Channel not found');

    // Fetch roles
    const [orgMembership, channelMembership] = await Promise.all([
      organizationMemberRepository.getMember(channel.org_id, (request.user as any).userId),
      channelMemberRepository.getMember(list.channel_id, (request.user as any).userId)
    ]);

    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'board.list.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to update board list');
    }

    const updated = await boardListService.updateList(id, request.body);
    this.emitTaskRefresh(request, list.channel_id, {
      scope: 'board',
      listId: id,
      reason: 'board_list_updated',
    });
    return sendSuccess(reply, updated, 'UPDATE');
  }

  // 2.2 Delete Board List
  async deleteBoardList(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;

    const list = await boardListRepository.getById(id);
    if (!list) return sendError(reply, HttpStatus.NOT_FOUND, 'List not found');

    const channel = await channelRepository.getById(list.channel_id);
    if (!channel) return sendError(reply, HttpStatus.NOT_FOUND, 'Channel not found');

    // Fetch roles
    const [orgMembership, channelMembership] = await Promise.all([
      organizationMemberRepository.getMember(channel.org_id, (request.user as any).userId),
      channelMemberRepository.getMember(list.channel_id, (request.user as any).userId)
    ]);

    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'board.list.delete')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to delete board list');
    }

    await boardListService.deleteList(id);
    this.emitTaskRefresh(request, list.channel_id, {
      scope: 'board',
      listId: id,
      reason: 'board_list_deleted',
    });
    return sendSuccess(reply, { success: true }, 'DELETE');
  }

  // 3. Create Task
  async createTask(
    request: FastifyRequest<{
      Body: {
        title: string;
        list_id: string;
        channel_id: string;
        org_id: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { userId } = request.user as any;
    const { channel_id, list_id } = request.body;

    // Check if channel exists
    const channel = await channelRepository.getById(channel_id);
    if (!channel) return sendError(reply, HttpStatus.NOT_FOUND, 'Channel not found');

    // Check if list exists in that channel
    const list = await boardListRepository.getById(list_id);
    if (!list || list.channel_id !== channel_id) {
      return sendError(reply, HttpStatus.NOT_FOUND, 'Target board list not found in this channel');
    }

    const orgId = channel.org_id;

    // Fetch roles
    const [orgMembership, channelMembership] = await Promise.all([
      organizationMemberRepository.getMember(orgId, userId),
      channelMemberRepository.getMember(channel_id, userId)
    ]);

    const orgRole = orgMembership?.role;
    const channelRole = channelMembership?.role;

    if (!PermissionGuard.canChannel(orgRole, channelRole, 'task.create')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to create task');
    }

    const task = this.normalizeStorageUrls(await taskService.createTask({
      ...request.body,
      creator_id: userId,
    }));
    this.emitTaskRefresh(request, channel_id, {
      scope: 'board',
      taskId: task.id,
      listId: list_id,
      reason: 'task_created',
    });
    return sendSuccess(reply, task, 'CREATE');
  }

  // 4. Move Task
  async moveTask(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { target_list_id: string; position: number };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const { target_list_id, position } = request.body;
    const userId = (request.user as any).userId;

    // Fetch task to find its org and channel
    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const orgId = task.org_id;
    const channelId = task.channel_id;

    // Fetch roles
    const [orgMembership, channelMembership] = await Promise.all([
      organizationMemberRepository.getMember(orgId, userId),
      channelMemberRepository.getMember(channelId, userId)
    ]);

    const orgRole = orgMembership?.role;
    const channelRole = channelMembership?.role;

    if (!PermissionGuard.canChannel(orgRole, channelRole, 'task.update-basic')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to move task');
    }

    const sourceListId = task.list_id;
    const updatedTask = await taskService.moveTask(id, target_list_id, position);

    // Log move activity — fire-and-forget, look up list name for context
    boardListRepository.getById(target_list_id)
      .then((targetList: any) => {
        activityService.logActivity(
          id,
          userId,
          'UPDATED',
          targetList ? `Moved to "${targetList.name}"` : 'Moved to another list'
        );
      })
      .catch((e: any) => console.error('[Activity]', e?.message ?? e));

    this.emitTaskMoved(request, channelId, {
      taskId: id,
      sourceListId,
      targetListId: target_list_id,
      position,
    });
    return sendSuccess(reply, this.normalizeStorageUrls(updatedTask), 'UPDATE');
  }

  // 5. Reorder Lists
  async reorderLists(
    request: FastifyRequest<{
      Body: { channel_id: string; items: { id: string; position: number }[] };
    }>,
    reply: FastifyReply
  ) {
    const { channel_id, items } = request.body;
    const userId = (request.user as any).userId;

    // Fetch channel to find its org
    const channel = await channelRepository.getById(channel_id);
    if (!channel) return sendError(reply, HttpStatus.NOT_FOUND, 'Channel not found');

    const orgId = channel.org_id;

    // Fetch roles
    const [orgMembership, channelMembership] = await Promise.all([
      organizationMemberRepository.getMember(orgId, userId),
      channelMemberRepository.getMember(channel_id, userId)
    ]);

    const orgRole = orgMembership?.role;
    const channelRole = channelMembership?.role;

    if (!PermissionGuard.canChannel(orgRole, channelRole, 'board.list.reorder')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to reorder lists');
    }

    await boardListService.reorderLists(items);
    this.emitBoardListsReordered(request, channel_id, items);
    return sendSuccess(reply, { success: true }, 'UPDATE');
  }

  // 6. Get Single Task Details
  getTask = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const userId = (request.user as any).userId;

    const task = await taskService.getTaskById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const orgId = task.org_id;
    const channelId = task.channel_id;

    // Fetch roles
    const [orgMembership, channelMembership] = await this.getRoles(orgId, channelId, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.view')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to view task details');
    }

    // Transform attachment URLs
    return sendSuccess(reply, this.normalizeStorageUrls(task), 'FETCH');
  };

  // 7.1 Update Task Content (Title & Description)
  updateTaskContent = async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        title?: string;
        description?: string;
        expectedUpdatedAt?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const userId = (request.user as any).userId;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-basic')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to update task content');
    }

    if (request.body.expectedUpdatedAt && task.updated_at && new Date(task.updated_at).toISOString() !== request.body.expectedUpdatedAt) {
      return sendError(reply, HttpStatus.CONFLICT, 'Task was updated by someone else');
    }

    const updatedTask = await taskService.updateTask(id, {
      title: request.body.title,
      description: request.body.description,
    }, {
      actorId: userId,
      type: 'UPDATED',
      content: request.body.title ? `Renamed to "${request.body.title}"` : 'Updated description',
    });

    if (task.parent_task_id && request.body.title && task.title !== request.body.title) {
      activityService.logActivity(
        task.parent_task_id,
        userId,
        'UPDATED',
        `Renamed subtask "${task.title}" to "${request.body.title}"`
      ).catch((e) => console.error("[Activity]", e?.message ?? e));
    }

    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'task+comments',
      taskId: id,
      listId: task.list_id,
      parentTaskId: task.parent_task_id || undefined,
      reason: 'task_content_updated',
    });
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'board',
      taskId: id,
      listId: task.list_id,
      parentTaskId: task.parent_task_id || undefined,
      reason: 'task_content_updated',
    });
    return sendSuccess(reply, this.normalizeStorageUrls(updatedTask), 'UPDATE');
  };

  // 7.2 Update Task Status
  updateTaskStatus = async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        status: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const userId = (request.user as any).userId;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-basic')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to update task status');
    }

    const updatedTask = await taskService.updateTask(id, {
      status: request.body.status,
      completed_at: request.body.status === 'COMPLETED' ? new Date() : null,
    }, {
      actorId: userId,
      type: 'STATUS_CHANGED',
      content: `Status → ${request.body.status.replace(/_/g, ' ')}`,
    });

    if (task.parent_task_id) {
      const isCompleted = request.body.status === 'COMPLETED';
      activityService.logActivity(
        task.parent_task_id,
        userId,
        'STATUS_CHANGED',
        isCompleted ? `Completed subtask "${task.title}"` : `Marked subtask "${task.title}" as incomplete`
      ).catch((e) => console.error("[Activity]", e?.message ?? e));
    }

    if (updatedTask.attachments) {
      updatedTask.attachments = updatedTask.attachments.map((att: any) => ({
        ...att,
        file_url: StorageService.getFileUrl(att.file_url)
      }));
    }
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'task',
      taskId: id,
      listId: task.list_id,
      parentTaskId: task.parent_task_id || undefined,
      reason: 'task_status_updated',
    });
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'board',
      taskId: id,
      listId: task.list_id,
      parentTaskId: task.parent_task_id || undefined,
      reason: 'task_status_updated',
    });
    return sendSuccess(reply, this.normalizeStorageUrls(updatedTask), 'UPDATE');
  };

  // 7.3 Update Task Manage (Due Date, Priority, Cover Color)
  updateTaskManage = async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        priority?: string;
        start_date?: string | Date;
        due_date?: string | Date;
        completed_at?: string | Date;
        cover_color?: string;
      };
    }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const userId = (request.user as any).userId;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-manage')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to manage task properties');
    }

    const body = request.body;
    const activityType = body.priority !== undefined
      ? 'PRIORITY_CHANGED'
      : body.due_date !== undefined
        ? 'DUE_DATE_CHANGED'
        : 'UPDATED';

    const activityContent = body.priority !== undefined
      ? `Priority → ${body.priority ?? 'None'}`
      : body.due_date !== undefined
        ? `Due date → ${body.due_date ? new Date(body.due_date as string).toDateString() : 'None'}`
        : undefined;

    const updatedTask = await taskService.updateTask(id, {
      priority: body.priority,
      start_date: body.start_date,
      due_date: body.due_date,
      completed_at: body.completed_at,
      cover_color: body.cover_color,
    }, {
      actorId: userId,
      type: activityType as any,
      content: activityContent,
    });

    if (updatedTask.attachments) {
      updatedTask.attachments = updatedTask.attachments.map((att: any) => ({
        ...att,
        file_url: StorageService.getFileUrl(att.file_url)
      }));
    }
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'task',
      taskId: id,
      listId: task.list_id,
      parentTaskId: task.parent_task_id || undefined,
      reason: 'task_manage_updated',
    });
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'board',
      taskId: id,
      listId: task.list_id,
      parentTaskId: task.parent_task_id || undefined,
      reason: 'task_manage_updated',
    });
    return sendSuccess(reply, this.normalizeStorageUrls(updatedTask), 'UPDATE');
  };

  // 7.5. Delete Task API
  deleteTask = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const userId = (request.user as any).userId;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.delete')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to delete task');
    }

    // Log before hard-delete so the task_id still resolves for the foreign key
    // (cascade delete on task_activities means the log row will be removed with the task;
    //  but if you want to keep logs, switch TaskActivity to onDelete: Restrict or SetNull)
    if (task.parent_task_id) {
      activityService.logActivity(
        task.parent_task_id,
        userId,
        'UPDATED',
        `Removed subtask "${task.title}"`
      ).catch((e) => console.error('[Activity]', e?.message ?? e));
    } else {
      activityService.logActivity(
        id,
        userId,
        'DELETED',
        `Deleted task "${task.title}"`
      ).catch((e) => console.error('[Activity]', e?.message ?? e));
    }

    await taskService.deleteTask(id);
    this.emitTaskDeleted(request, task.channel_id, {
      taskId: id,
      listId: task.list_id,
      parentTaskId: task.parent_task_id || undefined,
    });
    return sendSuccess(reply, { success: true }, 'DELETE');
  };

  // PHASE 4 — Collaboration Features

  // 8. Assignments
  async assignUser(request: FastifyRequest<{ Params: { id: string }; Body: { user_id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const { user_id } = request.body;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-manage')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to assign users');
    }

    // Verify target user exists
    const { prisma } = await import('@/lib/database');
    const targetUser = await prisma.user.findUnique({ where: { id: user_id } });
    if (!targetUser) return sendError(reply, HttpStatus.NOT_FOUND, 'Target user not found');

      const assignment = await assignmentService.assignUser(
        id,
        user_id,
        userId,
        targetUser.name
      );
      await NotificationService.create({
        userId: user_id,
        orgId: task.org_id,
        actorUserId: userId,
        type: 'TASK_ASSIGNED',
        entityType: 'TASK',
        entityId: task.id,
        title: 'Task assigned to you',
        body: `${(request.user as any).name} assigned you to "${task.title}"`,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          channelId: task.channel_id,
        },
      }, request.server.io);
      if (task.parent_task_id) {
      activityService.logActivity(
        task.parent_task_id,
        userId,
        'ASSIGNED',
        `Assigned subtask "${task.title}" to ${targetUser.name}`
      ).catch((e) => console.error("[Activity]", e?.message ?? e));
    }
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'task',
      taskId: id,
      listId: task.list_id,
      parentTaskId: task.parent_task_id || undefined,
      reason: 'task_assignment_created',
    });
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'board',
      taskId: id,
      listId: task.list_id,
      reason: 'task_assignment_created',
    });
    return sendSuccess(reply, this.normalizeStorageUrls(assignment), 'CREATE');
  }

  async unassignUser(request: FastifyRequest<{ Params: { id: string; userId: string } }>, reply: FastifyReply) {
    const { id, userId: targetUserId } = request.params;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-manage')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to unassign users');
    }

    const { prisma: db } = await import('@/lib/database');
    const targetUserForUnassign = await db.user.findUnique({ where: { id: targetUserId }, select: { name: true } });
    await assignmentService.unassignUser(id, targetUserId, userId, targetUserForUnassign?.name ?? undefined);
    if (task.parent_task_id) {
      activityService.logActivity(
        task.parent_task_id,
        userId,
        'UNASSIGNED',
        `Unassigned subtask "${task.title}" (previously assigned to ${targetUserForUnassign?.name ?? 'member'})`
      ).catch((e) => console.error("[Activity]", e?.message ?? e));
    }
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'task',
      taskId: id,
      listId: task.list_id,
      parentTaskId: task.parent_task_id || undefined,
      reason: 'task_assignment_deleted',
    });
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'board',
      taskId: id,
      listId: task.list_id,
      reason: 'task_assignment_deleted',
    });
    return sendSuccess(reply, { success: true }, 'DELETE');
  }

  // 9. Comments
  async createComment(request: FastifyRequest<{ Params: { id: string }; Body: { content: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const { content } = request.body;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.comment')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to comment');
    }

      const comment = await commentService.createComment(id, userId, content);
      const mentionedUserIds = NotificationService.extractMentionedUserIds(content);
      if (mentionedUserIds.length > 0) {
        const { prisma } = await import('@/lib/database');
        const memberships = await prisma.organizationMember.findMany({
          where: {
            organization_id: task.org_id,
            user_id: { in: mentionedUserIds.filter((mentionedUserId) => mentionedUserId !== userId) },
          },
          select: { user_id: true },
        });

        await Promise.all(
          memberships.map((membership) =>
            NotificationService.create({
              userId: membership.user_id,
              orgId: task.org_id,
              actorUserId: userId,
              type: 'TASK_COMMENT_MENTION',
              entityType: 'TASK',
              entityId: task.id,
              title: 'Mentioned in a task comment',
              body: `${(request.user as any).name} mentioned you on "${task.title}"`,
              metadata: {
                taskId: task.id,
                taskTitle: task.title,
                channelId: task.channel_id,
                commentId: comment.id,
              },
            }, request.server.io)
          )
        );
      }
      request.server.io?.to(`channel:${task.channel_id}`).emit('channel:task_comment_created', {
      channelId: task.channel_id,
      taskId: id,
      actorUserId: userId,
      timestamp: new Date().toISOString(),
      comment,
    });
    return sendSuccess(reply, this.normalizeStorageUrls(comment), 'CREATE');
  }

  async getComments(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.view')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to view comments');
    }

    const comments = await commentService.getComments(id);
    return sendSuccess(reply, this.normalizeStorageUrls(comments), 'FETCH');
  }

  // 10. Checklists
  createChecklist = async (request: FastifyRequest<{ Params: { id: string }; Body: { title: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { title } = request.body;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-basic')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to create checklists');
    }

    const checklist = await checklistService.createChecklist(id, title, userId);
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'task',
      taskId: id,
      listId: task.list_id,
      reason: 'checklist_created',
    });
    return sendSuccess(reply, this.normalizeStorageUrls(checklist), 'CREATE');
  };

  updateChecklist = async (request: FastifyRequest<{ Params: { id: string }; Body: { title?: string; assignee_id?: string | null } }>, reply: FastifyReply) => {
    const { id: checklistId } = request.params;
    const { title, assignee_id } = request.body;
    const { userId } = request.user as any;

    const checklist = await checklistRepository.getById(checklistId, { include: { task: true } });
    if (!checklist) return sendError(reply, HttpStatus.NOT_FOUND, 'Checklist not found');

    const [orgMembership, channelMembership] = await this.getRoles((checklist as any).task.org_id, (checklist as any).task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-basic')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to update checklists');
    }

    const oldAssigneeId = (checklist as any).assignee_id;
    const oldTitle = (checklist as any).name;

    const updatedChecklist = await checklistService.updateChecklist(checklistId, title || oldTitle, assignee_id);

    // Log updates
    if (title && title !== oldTitle) {
      activityService.logActivity(
        (checklist as any).task.id,
        userId,
        'CHECKLIST_UPDATED',
        `Renamed checklist "${oldTitle}" to "${title}"`
      ).catch((e) => console.error('[Activity]', e?.message ?? e));
    }

    if (assignee_id !== undefined && assignee_id !== oldAssigneeId) {
      const { prisma: db } = await import('@/lib/database');
      
      let oldAssigneeName = '';
      if (oldAssigneeId) {
        const u = await db.user.findUnique({ where: { id: oldAssigneeId }, select: { name: true } });
        oldAssigneeName = u?.name || 'someone';
      }

      let newAssigneeName = '';
      if (assignee_id) {
        const u = await db.user.findUnique({ where: { id: assignee_id }, select: { name: true } });
        newAssigneeName = u?.name || 'someone';
      }

      let logMessage = '';
      const checklistTitle = title || oldTitle;
      if (oldAssigneeId && assignee_id) {
        logMessage = `Changed assignee of checklist "${checklistTitle}" from ${oldAssigneeName} to ${newAssigneeName}`;
      } else if (assignee_id) {
        logMessage = `Assigned checklist "${checklistTitle}" to ${newAssigneeName}`;
      } else if (oldAssigneeId) {
        logMessage = `Unassigned checklist "${checklistTitle}" (previously assigned to ${oldAssigneeName})`;
      }

      if (logMessage) {
        activityService.logActivity(
          (checklist as any).task.id,
          userId,
          'CHECKLIST_UPDATED',
          logMessage
        ).catch((e) => console.error('[Activity]', e?.message ?? e));
      }
    }

    this.emitTaskRefresh(request, (checklist as any).task.channel_id, {
      scope: 'task',
      taskId: (checklist as any).task.id,
      listId: (checklist as any).task.list_id,
      reason: 'checklist_updated',
    });
    return sendSuccess(reply, this.normalizeStorageUrls(updatedChecklist), 'UPDATE');
  };

  addChecklistItem = async (request: FastifyRequest<{ Params: { id: string }; Body: { text: string; position?: number } }>, reply: FastifyReply) => {
    const { id: checklistId } = request.params;
    const { text, position } = request.body;
    const { userId } = request.user as any;

    // We need to find the task associated with the checklist for permission check
    const checklist = await checklistRepository.getById(checklistId, { include: { task: true } });
    if (!checklist) return sendError(reply, HttpStatus.NOT_FOUND, 'Checklist not found');

    const [orgMembership, channelMembership] = await this.getRoles((checklist as any).task.org_id, (checklist as any).task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-basic')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to add items');
    }

    const item = await checklistService.addItem(checklistId, userId, text, position);
    activityService.logActivity(
      (checklist as any).task.id,
      userId,
      'CHECKLIST_UPDATED',
      `Added item "${text}"`
    ).catch((e) => console.error('[Activity]', e?.message ?? e));
    this.emitTaskRefresh(request, (checklist as any).task.channel_id, {
      scope: 'task',
      taskId: (checklist as any).task.id,
      listId: (checklist as any).task.list_id,
      reason: 'checklist_item_created',
    });
    return sendSuccess(reply, this.normalizeStorageUrls(item), 'CREATE');
  };

  updateChecklistItem = async (request: FastifyRequest<{ Params: { id: string }; Body: { text?: string; is_completed?: boolean; position?: number; assignee_id?: string | null } }>, reply: FastifyReply) => {
    const { id: itemId } = request.params;
    const { userId } = request.user as any;

    const item = await checklistItemRepository.getById(itemId, {
      include: {
        checklist: { include: { task: true } },
        assignee: { select: { id: true, name: true } }
      }
    });
    if (!item) return sendError(reply, HttpStatus.NOT_FOUND, 'Item not found');

    const [orgMembership, channelMembership] = await this.getRoles((item as any).checklist.task.org_id, (item as any).checklist.task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-basic')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to update items');
    }

    const { is_completed, text, position, assignee_id } = request.body;
    const itemText = (item as any).text as string;
    const updateData: any = {};
    if (is_completed !== undefined) updateData.is_completed = is_completed;
    if (text !== undefined) updateData.text = text;
    if (position !== undefined) updateData.position = position;
    if (assignee_id !== undefined) updateData.assignee_id = assignee_id;

    const updatedItem = await checklistService.updateItem(itemId, updateData, {
      taskId: (item as any).checklist.task.id,
      actorId: userId,
    });

    // Log assignee change (is_completed toggle is handled inside checklistService.updateItem)
    if (assignee_id !== undefined && is_completed === undefined) {
      const oldAssignee = (item as any).assignee;
      const oldAssigneeId = oldAssignee?.id || null;
      const newAssigneeId = assignee_id;

      if (oldAssigneeId !== newAssigneeId) {
        const { prisma: db } = await import('@/lib/database');
        
        let oldAssigneeName = oldAssignee?.name || '';
        let newAssigneeName = '';

        if (newAssigneeId) {
          const userObj = await db.user.findUnique({ where: { id: newAssigneeId }, select: { name: true } });
          newAssigneeName = userObj?.name || 'someone';
        }

        let activityContent = '';
        if (oldAssigneeId && newAssigneeId) {
          activityContent = `Changed assignee of "${itemText}" from ${oldAssigneeName} to ${newAssigneeName}`;
        } else if (newAssigneeId) {
          activityContent = `Assigned "${itemText}" to ${newAssigneeName}`;
        } else if (oldAssigneeId) {
          activityContent = `Unassigned "${itemText}" (previously assigned to ${oldAssigneeName})`;
        }

        if (activityContent) {
          activityService.logActivity(
            (item as any).checklist.task.id,
            userId,
            'CHECKLIST_UPDATED',
            activityContent
          ).catch((e) => console.error('[Activity]', e?.message ?? e));
        }
      }
    }

    this.emitTaskRefresh(request, (item as any).checklist.task.channel_id, {
      scope: 'task',
      taskId: (item as any).checklist.task.id,
      listId: (item as any).checklist.task.list_id,
      reason: 'checklist_item_updated',
    });
    return sendSuccess(reply, this.normalizeStorageUrls(updatedItem), 'UPDATE');
  };

  deleteChecklistItem = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id: itemId } = request.params;
    const { userId } = request.user as any;

    const item = await checklistItemRepository.getById(itemId, { include: { checklist: { include: { task: true } } } });
    if (!item) return sendError(reply, HttpStatus.NOT_FOUND, 'Item not found');

    const [orgMembership, channelMembership] = await this.getRoles((item as any).checklist.task.org_id, (item as any).checklist.task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-basic')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to delete items');
    }

    const deletedItemText = (item as any).text as string;
    await checklistService.deleteItem(itemId);
    activityService.logActivity(
      (item as any).checklist.task.id,
      userId,
      'CHECKLIST_UPDATED',
      `Removed item "${deletedItemText}"`
    ).catch((e) => console.error('[Activity]', e?.message ?? e));
    this.emitTaskRefresh(request, (item as any).checklist.task.channel_id, {
      scope: 'task',
      taskId: (item as any).checklist.task.id,
      listId: (item as any).checklist.task.list_id,
      reason: 'checklist_item_deleted',
    });
    return sendSuccess(reply, { success: true }, 'DELETE');
  };

  deleteChecklist = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id: checklistId } = request.params;
    const { userId } = request.user as any;

    const checklist = await checklistRepository.getById(checklistId, { include: { task: true } });
    if (!checklist) return sendError(reply, HttpStatus.NOT_FOUND, 'Checklist not found');

    const [orgMembership, channelMembership] = await this.getRoles((checklist as any).task.org_id, (checklist as any).task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-basic')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to delete checklists');
    }

    await checklistService.deleteChecklist(checklistId);
    activityService.logActivity(
      (checklist as any).task.id,
      userId,
      'CHECKLIST_UPDATED',
      `Removed checklist "${checklist.name}"`
    ).catch((e) => console.error('[Activity]', e?.message ?? e));

    this.emitTaskRefresh(request, (checklist as any).task.channel_id, {
      scope: 'task',
      taskId: (checklist as any).task.id,
      listId: (checklist as any).task.list_id,
      reason: 'checklist_deleted',
    });
    return sendSuccess(reply, { success: true }, 'DELETE');
  };

  // 12. Labels
  createLabel = async (request: FastifyRequest<{ Body: { org_id: string; name: string; color: string } }>, reply: FastifyReply) => {
    const { org_id, name, color } = request.body;
    const { userId } = request.user as any;

    const orgMembership = await organizationMemberRepository.getMember(org_id, userId);

    if (!PermissionGuard.canOrg(orgMembership?.role, 'label.manage')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to create labels');
    }

    const label = await labelService.createLabel(org_id, name, color);
    return sendSuccess(reply, label, 'CREATE');
  };

  deleteLabel = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { userId } = request.user as any;

    const label = await labelRepository.getById(id);
    if (!label) return sendError(reply, HttpStatus.NOT_FOUND, 'Label not found');

    const orgMembership = await organizationMemberRepository.getMember(label.org_id, userId);
    if (!PermissionGuard.canOrg(orgMembership?.role, 'label.manage')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to delete labels');
    }

    await labelService.deleteLabel(id);
    return sendSuccess(reply, { success: true }, 'DELETE');
  };

  assignLabel = async (request: FastifyRequest<{ Params: { id: string }; Body: { label_id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { label_id } = request.body;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-manage')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to assign labels');
    }

    // Resolve label name for content
    const labelRecord = await labelRepository.getById(label_id);
    const assignment = await labelService.assignLabel(id, label_id, userId, labelRecord?.name);
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'task',
      taskId: id,
      listId: task.list_id,
      reason: 'task_label_created',
    });
    return sendSuccess(reply, assignment, 'CREATE');
  };

  unassignLabel = async (request: FastifyRequest<{ Params: { id: string; labelId: string } }>, reply: FastifyReply) => {
    const { id, labelId } = request.params;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-manage')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to unassign labels');
    }

    const labelForRemove = await labelRepository.getById(labelId);
    await labelService.unassignLabel(id, labelId, userId, labelForRemove?.name ?? undefined);
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'task',
      taskId: id,
      listId: task.list_id,
      reason: 'task_label_deleted',
    });
    return sendSuccess(reply, { success: true }, 'DELETE');
  };

  getOrgLabels = async (request: FastifyRequest<{ Params: { orgId: string } }>, reply: FastifyReply) => {
    const { orgId } = request.params;
    const { userId } = request.user as any;

    const orgMembership = await organizationMemberRepository.getMember(orgId, userId);
    if (!orgMembership) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'You are not a member of this organization');
    }

    const labels = await labelService.getOrgLabels(orgId);
    return sendSuccess(reply, labels, 'FETCH');
  };

  // 11. Attachments
  addAttachment = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { userId } = request.user as any;

    // 1. Get task and check permissions
    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.attachment')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to add attachments');
    }

    // 2. Handle File Upload
    const data = await request.file();
    if (!data) return sendError(reply, HttpStatus.BAD_REQUEST, 'No file uploaded');

    try {
      const buffer = await data.toBuffer();
      const saved = await StorageService.saveFile({
        filename: data.filename,
        buffer,
        mimetype: data.mimetype
      }, 'task');

      // 3. Save to Database
      const attachment = await attachmentService.addAttachment(id, userId, {
        name: data.filename,
        url: saved.file_url, // This is the relative path (e.g. task/xyz.png)
        file_type: data.mimetype,
        file_size: saved.file_size
      });

      this.emitTaskRefresh(request, task.channel_id, {
        scope: 'task',
        taskId: id,
        listId: task.list_id,
        reason: 'task_attachment_created',
      });
      return sendSuccess(reply, this.normalizeStorageUrls({
        ...attachment,
      }), 'CREATE');
    } catch (err: any) {
      return sendError(reply, HttpStatus.BAD_REQUEST, err.message || 'File upload failed');
    }
  };

  deleteAttachment = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id: attachmentId } = request.params;
    const { userId } = request.user as any;

    const attachment = await attachmentRepository.getById(attachmentId);
    if (!attachment) return sendError(reply, HttpStatus.NOT_FOUND, 'Attachment not found');

    const task = await taskRepository.getById(attachment.task_id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.attachment')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to remove attachments');
    }

    await attachmentService.deleteAttachment(attachmentId);

    // Delete physical file
    await StorageService.deleteFile(attachment.file_url);

    // Log activity
    activityService.logActivity(
      task.id,
      userId,
      'ATTACHMENT_ADDED',
      `Removed attachment "${attachment.file_name}"`
    ).catch((e) => console.error('[Activity]', e?.message ?? e));

    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'task',
      taskId: task.id,
      listId: task.list_id,
      reason: 'task_attachment_deleted',
    });
    return sendSuccess(reply, { success: true }, 'DELETE');
  };

  // PHASE 5 — Nested Tasks
  createSubtask = async (request: FastifyRequest<{ Params: { id: string }; Body: { title: string } }>, reply: FastifyReply) => {
    const { id: parentId } = request.params;
    const { title } = request.body;
    const { userId } = request.user as any;

    const parentTask = await taskRepository.getById(parentId);
    if (!parentTask) return sendError(reply, HttpStatus.NOT_FOUND, 'Parent task not found');

    const [orgMembership, channelMembership] = await this.getRoles(parentTask.org_id, parentTask.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-basic')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to create subtasks');
    }

    const subtask = await taskService.createSubtask(parentId, { title, creator_id: userId });
    this.emitTaskRefresh(request, parentTask.channel_id, {
      scope: 'task',
      taskId: parentId,
      parentTaskId: parentId,
      listId: parentTask.list_id,
      reason: 'subtask_created',
    });
    this.emitTaskRefresh(request, parentTask.channel_id, {
      scope: 'board',
      taskId: parentId,
      listId: parentTask.list_id,
      reason: 'subtask_created',
    });
    return sendSuccess(reply, this.normalizeStorageUrls(subtask), 'CREATE');
  };

  // PHASE 6 — Activity Feed

  /**
   * GET /tasks/:id/activities
   * Returns a paginated activity log for a task.
   */
  getActivities = async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: { page?: number; limit?: number } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { userId } = request.user as any;
    const page = Number(request.query.page ?? 1);
    const limit = Number(request.query.limit ?? 50);

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.view')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to view task activities');
    }

    const result = await activityService.getActivities(id, page, limit);
    return sendSuccess(reply, this.normalizeStorageUrls(result), 'FETCH');
  };

  /**
   * DELETE /activities/:id
   * Hard-deletes a single activity log entry (admin / audit cleanup).
   */
  deleteActivity = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id: activityId } = request.params;
    const { userId } = request.user as any;

    const activity = await activityRepository.getById(activityId);
    if (!activity) return sendError(reply, HttpStatus.NOT_FOUND, 'Activity not found');

    // Resolve the parent task for permission check
    const task = await taskRepository.getById(activity.task_id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    // Only managers / admins can delete audit log entries
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-manage')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to delete activity entries');
    }

    await activityService.deleteActivity(activityId);
    return sendSuccess(reply, { success: true }, 'DELETE');
  };

  // Private Helper
  private async getRoles(orgId: string, channelId: string, userId: string) {
    return Promise.all([
      organizationMemberRepository.getMember(orgId, userId),
      channelMemberRepository.getMember(channelId, userId)
    ]);
  }

  /**
   * GET /tasks/assigned?orgId=...
   * Returns all tasks/checklists/items assigned to the currently authenticated user.
   * The optional `orgId` query param scopes results to a specific workspace.
   */
  getMyTasks = async (
    request: FastifyRequest<{ Querystring: { orgId?: string } }>,
    reply: FastifyReply
  ) => {
    const { userId } = request.user as any;
    const { orgId } = request.query;

    const result = await taskService.getMyTasks(userId, orgId);
    return sendSuccess(reply, this.normalizeStorageUrls(result), 'FETCH');
  };
}

export const taskController = new TaskController();
