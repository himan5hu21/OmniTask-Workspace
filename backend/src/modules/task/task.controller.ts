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
import { checklistItemRepository } from '@/repositories/checklist-item.repository';
import { checklistRepository } from '@/repositories/checklist.repository';
import { channelRepository } from '@/repositories/channel.repository';
import { taskRepository } from '@/repositories/task.repository';

export class TaskController {
  constructor() {
    this.createBoardList = this.createBoardList.bind(this);
    this.getBoard = this.getBoard.bind(this);
    this.createTask = this.createTask.bind(this);
    this.moveTask = this.moveTask.bind(this);
    this.reorderLists = this.reorderLists.bind(this);
    this.getTask = this.getTask.bind(this);
    this.updateTask = this.updateTask.bind(this);
    this.assignUser = this.assignUser.bind(this);
    this.unassignUser = this.unassignUser.bind(this);
    this.createComment = this.createComment.bind(this);
    this.getComments = this.getComments.bind(this);
    this.createChecklist = this.createChecklist.bind(this);
    this.addChecklistItem = this.addChecklistItem.bind(this);
    this.updateChecklistItem = this.updateChecklistItem.bind(this);
    this.createLabel = this.createLabel.bind(this);
    this.assignLabel = this.assignLabel.bind(this);
    this.addAttachment = this.addAttachment.bind(this);
    this.createSubtask = this.createSubtask.bind(this);
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

    if (!PermissionGuard.canChannel(orgRole, channelRole, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to move task');
    }

    const updatedTask = await taskService.moveTask(id, target_list_id, position);
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
    return sendSuccess(reply, { success: true }, 'UPDATE');
  }

  // 6. Get Single Task Details
  async getTask(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const userId = (request.user as any).userId;

    const task = await taskService.getTaskById(id);
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

    if (!PermissionGuard.canChannel(orgRole, channelRole, 'task.view')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to view task details');
    }

    return sendSuccess(reply, task, 'FETCH');
  }

  // 7. Update Task API
  async updateTask(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        title?: string;
        description?: string;
        priority?: string;
        due_date?: string;
        cover_color?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const userId = (request.user as any).userId;

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

    if (!PermissionGuard.canChannel(orgRole, channelRole, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to update task');
    }

    const updatedTask = await taskService.updateTask(id, request.body);
    return sendSuccess(reply, updatedTask, 'UPDATE');
  }

  // PHASE 4 — Collaboration Features

  // 8. Assignments
  async assignUser(request: FastifyRequest<{ Params: { id: string }; Body: { user_id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const { user_id } = request.body;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to assign users');
    }

    // Verify target user exists
    const { prisma } = await import('@/lib/database');
    const targetUser = await prisma.user.findUnique({ where: { id: user_id } });
    if (!targetUser) return sendError(reply, HttpStatus.NOT_FOUND, 'Target user not found');

    const assignment = await assignmentService.assignUser(id, user_id);
    return sendSuccess(reply, assignment, 'CREATE');
  }

  async unassignUser(request: FastifyRequest<{ Params: { id: string; userId: string } }>, reply: FastifyReply) {
    const { id, userId: targetUserId } = request.params;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to unassign users');
    }

    await assignmentService.unassignUser(id, targetUserId);
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
  async createChecklist(request: FastifyRequest<{ Params: { id: string }; Body: { title: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const { title } = request.body;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to create checklists');
    }

    const checklist = await checklistService.createChecklist(id, title);
    return sendSuccess(reply, checklist, 'CREATE');
  }

  async addChecklistItem(request: FastifyRequest<{ Params: { id: string }; Body: { title: string; position?: number } }>, reply: FastifyReply) {
    const { id: checklistId } = request.params;
    const { title, position } = request.body;
    const { userId } = request.user as any;

    // We need to find the task associated with the checklist for permission check
    const checklist = await checklistRepository.getById(checklistId, { include: { task: true } });
    if (!checklist) return sendError(reply, HttpStatus.NOT_FOUND, 'Checklist not found');

    const [orgMembership, channelMembership] = await this.getRoles((checklist as any).task.org_id, (checklist as any).task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to add items');
    }

    const item = await checklistService.addItem(checklistId, title, position);
    return sendSuccess(reply, item, 'CREATE');
  }

  async updateChecklistItem(request: FastifyRequest<{ Params: { id: string }; Body: { title?: string; is_completed?: boolean; position?: number } }>, reply: FastifyReply) {
    const { id: itemId } = request.params;
    const { userId } = request.user as any;

    const item = await checklistItemRepository.getById(itemId, { include: { checklist: { include: { task: true } } } });
    if (!item) return sendError(reply, HttpStatus.NOT_FOUND, 'Item not found');

    const [orgMembership, channelMembership] = await this.getRoles((item as any).checklist.task.org_id, (item as any).checklist.task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to update items');
    }

    const updatedItem = await checklistService.updateItem(itemId, request.body);
    return sendSuccess(reply, updatedItem, 'UPDATE');
  }

  // 12. Labels
  async createLabel(request: FastifyRequest<{ Body: { org_id: string; name: string; color: string } }>, reply: FastifyReply) {
    const { org_id, name, color } = request.body;
    const { userId } = request.user as any;

    const orgMembership = await organizationMemberRepository.getMember(org_id, userId);

    if (!PermissionGuard.canOrg(orgMembership?.role, 'label.manage')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to create labels');
    }

    const label = await labelService.createLabel(org_id, name, color);
    return sendSuccess(reply, label, 'CREATE');
  }

  async assignLabel(request: FastifyRequest<{ Params: { id: string }; Body: { label_id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const { label_id } = request.body;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to assign labels');
    }

    const assignment = await labelService.assignLabel(id, label_id);
    return sendSuccess(reply, assignment, 'CREATE');
  }

  // 11. Attachments
  async addAttachment(request: FastifyRequest<{ Params: { id: string }; Body: { name: string; url: string; file_type: string; file_size: number } }>, reply: FastifyReply) {
    const { id } = request.params;
    const { userId } = request.user as any;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to add attachments');
    }

    const attachment = await attachmentService.addAttachment(id, userId, request.body);
    return sendSuccess(reply, attachment, 'CREATE');
  }

  // PHASE 5 — Nested Tasks
  async createSubtask(request: FastifyRequest<{ Params: { id: string }; Body: { title: string } }>, reply: FastifyReply) {
    const { id: parentId } = request.params;
    const { title } = request.body;
    const { userId } = request.user as any;

    const parentTask = await taskRepository.getById(parentId);
    if (!parentTask) return sendError(reply, HttpStatus.NOT_FOUND, 'Parent task not found');

    const [orgMembership, channelMembership] = await this.getRoles(parentTask.org_id, parentTask.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to create subtasks');
    }

    const subtask = await taskService.createSubtask(parentId, { title, creator_id: userId });
    return sendSuccess(reply, subtask, 'CREATE');
  }

  // Private Helper
  private async getRoles(orgId: string, channelId: string, userId: string) {
    return Promise.all([
      organizationMemberRepository.getMember(orgId, userId),
      channelMemberRepository.getMember(channelId, userId)
    ]);
  }
}

export const taskController = new TaskController();
