// Task management controller
import { FastifyReply, FastifyRequest } from 'fastify';
import { taskService } from './task.service';
import { boardListService } from './board-list.service';
import { assignmentService } from './assignment.service';
import { commentService } from './comment.service';
import { checklistService } from './checklist.service';
import { labelService } from './label.service';
import { attachmentService } from './attachment.service';
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
import { StorageService } from '@/lib/storage';

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

    const tasks = await taskService.getTasksByList(id, page, limit);
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

    const task = await taskService.createTask({
      ...request.body,
      creator_id: userId,
    });
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
    this.emitTaskMoved(request, channelId, {
      taskId: id,
      sourceListId,
      targetListId: target_list_id,
      position,
    });
    return sendSuccess(reply, updatedTask, 'UPDATE');
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
    if (task.attachments) {
      task.attachments = task.attachments.map((att: any) => ({
        ...att,
        file_url: StorageService.getFileUrl(att.file_url)
      }));
    }

    return sendSuccess(reply, task, 'FETCH');
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
    });

    if (updatedTask.attachments) {
      updatedTask.attachments = updatedTask.attachments.map((att: any) => ({
        ...att,
        file_url: StorageService.getFileUrl(att.file_url)
      }));
    }
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'task+comments',
      taskId: id,
      listId: task.list_id,
      reason: 'task_content_updated',
    });
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'board',
      taskId: id,
      listId: task.list_id,
      reason: 'task_content_updated',
    });
    return sendSuccess(reply, updatedTask, 'UPDATE');
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
      reason: 'task_status_updated',
    });
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'board',
      taskId: id,
      listId: task.list_id,
      reason: 'task_status_updated',
    });
    return sendSuccess(reply, updatedTask, 'UPDATE');
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

    const updatedTask = await taskService.updateTask(id, {
      priority: request.body.priority,
      start_date: request.body.start_date,
      due_date: request.body.due_date,
      completed_at: request.body.completed_at,
      cover_color: request.body.cover_color,
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
      reason: 'task_manage_updated',
    });
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'board',
      taskId: id,
      listId: task.list_id,
      reason: 'task_manage_updated',
    });
    return sendSuccess(reply, updatedTask, 'UPDATE');
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

    const assignment = await assignmentService.assignUser(id, user_id);
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
    return sendSuccess(reply, assignment, 'CREATE');
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

    await assignmentService.unassignUser(id, targetUserId);
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
    request.server.io?.to(`channel:${task.channel_id}`).emit('channel:task_comment_created', {
      channelId: task.channel_id,
      taskId: id,
      actorUserId: userId,
      timestamp: new Date().toISOString(),
      comment,
    });
    return sendSuccess(reply, comment, 'CREATE');
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
    return sendSuccess(reply, comments, 'FETCH');
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

    const checklist = await checklistService.createChecklist(id, title);
    this.emitTaskRefresh(request, task.channel_id, {
      scope: 'task',
      taskId: id,
      listId: task.list_id,
      reason: 'checklist_created',
    });
    return sendSuccess(reply, checklist, 'CREATE');
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

    const updatedChecklist = await checklistService.updateChecklist(checklistId, title || (checklist as any).name, assignee_id);
    this.emitTaskRefresh(request, (checklist as any).task.channel_id, {
      scope: 'task',
      taskId: (checklist as any).task.id,
      listId: (checklist as any).task.list_id,
      reason: 'checklist_updated',
    });
    return sendSuccess(reply, updatedChecklist, 'UPDATE');
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
    this.emitTaskRefresh(request, (checklist as any).task.channel_id, {
      scope: 'task',
      taskId: (checklist as any).task.id,
      listId: (checklist as any).task.list_id,
      reason: 'checklist_item_created',
    });
    return sendSuccess(reply, item, 'CREATE');
  };

  updateChecklistItem = async (request: FastifyRequest<{ Params: { id: string }; Body: { text?: string; is_completed?: boolean; position?: number; assignee_id?: string | null } }>, reply: FastifyReply) => {
    const { id: itemId } = request.params;
    const { userId } = request.user as any;

    const item = await checklistItemRepository.getById(itemId, { include: { checklist: { include: { task: true } } } });
    if (!item) return sendError(reply, HttpStatus.NOT_FOUND, 'Item not found');

    const [orgMembership, channelMembership] = await this.getRoles((item as any).checklist.task.org_id, (item as any).checklist.task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.update-basic')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to update items');
    }

    const { is_completed, text, position, assignee_id } = request.body;
    const updateData: any = {};
    if (is_completed !== undefined) updateData.is_completed = is_completed;
    if (text !== undefined) updateData.text = text;
    if (position !== undefined) updateData.position = position;
    if (assignee_id !== undefined) updateData.assignee_id = assignee_id;

    const updatedItem = await checklistService.updateItem(itemId, updateData);
    this.emitTaskRefresh(request, (item as any).checklist.task.channel_id, {
      scope: 'task',
      taskId: (item as any).checklist.task.id,
      listId: (item as any).checklist.task.list_id,
      reason: 'checklist_item_updated',
    });
    return sendSuccess(reply, updatedItem, 'UPDATE');
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

    await checklistService.deleteItem(itemId);
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

    const assignment = await labelService.assignLabel(id, label_id);
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

    await labelService.unassignLabel(id, labelId);
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
      return sendSuccess(reply, {
        ...attachment,
        file_url: StorageService.getFileUrl(attachment.file_url) // Return full URL for frontend
      }, 'CREATE');
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
    return sendSuccess(reply, subtask, 'CREATE');
  };

  // Private Helper
  private async getRoles(orgId: string, channelId: string, userId: string) {
    return Promise.all([
      organizationMemberRepository.getMember(orgId, userId),
      channelMemberRepository.getMember(channelId, userId)
    ]);
  }
}

export const taskController = new TaskController();
