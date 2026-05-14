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

export class TaskController {
  constructor() {
    this.createBoardList = this.createBoardList.bind(this);
    this.getBoard = this.getBoard.bind(this);
    this.createTask = this.createTask.bind(this);
    this.moveTask = this.moveTask.bind(this);
    this.reorderLists = this.reorderLists.bind(this);
    this.updateBoardList = this.updateBoardList.bind(this);
    this.deleteBoardList = this.deleteBoardList.bind(this);
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
    this.deleteTask = this.deleteTask.bind(this);
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

    return sendSuccess(reply, task, 'FETCH');
  };

  // 7. Update Task API
  updateTask = async (
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
  ) => {
    const { id } = request.params;
    const userId = (request.user as any).userId;

    const task = await taskRepository.getById(id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const orgId = task.org_id;
    const channelId = task.channel_id;

    // Fetch roles
    const [orgMembership, channelMembership] = await this.getRoles(orgId, channelId, userId);

    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to update task');
    }

    const updatedTask = await taskService.updateTask(id, request.body);
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
    return sendSuccess(reply, { success: true }, 'DELETE');
  };

  // PHASE 4 — Collaboration Features

  // 8. Assignments
  async assignUser(request: FastifyRequest<{ Params: { id: string }; Body: { user_id: string; role?: any } }>, reply: FastifyReply) {
    const { id } = request.params;
    const { user_id, role } = request.body;
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

    const assignment = await assignmentService.assignUser(id, user_id, role);
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
  createChecklist = async (request: FastifyRequest<{ Params: { id: string }; Body: { title: string } }>, reply: FastifyReply) => {
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
  };

  updateChecklist = async (request: FastifyRequest<{ Params: { id: string }; Body: { title: string } }>, reply: FastifyReply) => {
    const { id: checklistId } = request.params;
    const { title } = request.body;
    const { userId } = request.user as any;

    const checklist = await checklistRepository.getById(checklistId, { include: { task: true } });
    if (!checklist) return sendError(reply, HttpStatus.NOT_FOUND, 'Checklist not found');

    const [orgMembership, channelMembership] = await this.getRoles((checklist as any).task.org_id, (checklist as any).task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to update checklists');
    }

    const updatedChecklist = await checklistService.updateChecklist(checklistId, title);
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
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to add items');
    }

    const item = await checklistService.addItem(checklistId, userId, text, position);
    return sendSuccess(reply, item, 'CREATE');
  };

  updateChecklistItem = async (request: FastifyRequest<{ Params: { id: string }; Body: { text?: string; is_completed?: boolean; position?: number } }>, reply: FastifyReply) => {
    const { id: itemId } = request.params;
    const { userId } = request.user as any;

    const item = await checklistItemRepository.getById(itemId, { include: { checklist: { include: { task: true } } } });
    if (!item) return sendError(reply, HttpStatus.NOT_FOUND, 'Item not found');

    const [orgMembership, channelMembership] = await this.getRoles((item as any).checklist.task.org_id, (item as any).checklist.task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to update items');
    }

    const { is_completed, text, position } = request.body;
    const updateData: any = {};
    if (is_completed !== undefined) updateData.is_completed = is_completed;
    if (text !== undefined) updateData.text = text;
    if (position !== undefined) updateData.position = position;

    const updatedItem = await checklistService.updateItem(itemId, updateData);
    return sendSuccess(reply, updatedItem, 'UPDATE');
  };

  deleteChecklistItem = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id: itemId } = request.params;
    const { userId } = request.user as any;

    const item = await checklistItemRepository.getById(itemId, { include: { checklist: { include: { task: true } } } });
    if (!item) return sendError(reply, HttpStatus.NOT_FOUND, 'Item not found');

    const [orgMembership, channelMembership] = await this.getRoles((item as any).checklist.task.org_id, (item as any).checklist.task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to delete items');
    }

    await checklistService.deleteItem(itemId);
    return sendSuccess(reply, { success: true }, 'DELETE');
  };

  deleteChecklist = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id: checklistId } = request.params;
    const { userId } = request.user as any;

    const checklist = await checklistRepository.getById(checklistId, { include: { task: true } });
    if (!checklist) return sendError(reply, HttpStatus.NOT_FOUND, 'Checklist not found');

    const [orgMembership, channelMembership] = await this.getRoles((checklist as any).task.org_id, (checklist as any).task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to delete checklists');
    }

    await checklistService.deleteChecklist(checklistId);
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

  assignLabel = async (request: FastifyRequest<{ Params: { id: string }; Body: { label_id: string } }>, reply: FastifyReply) => {
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
  };

  // 11. Attachments
  addAttachment = async (request: FastifyRequest<{ Params: { id: string }; Body: { name: string; url: string; file_type: string; file_size: number } }>, reply: FastifyReply) => {
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
  };

  deleteAttachment = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id: attachmentId } = request.params;
    const { userId } = request.user as any;

    const attachment = await attachmentRepository.getById(attachmentId);
    if (!attachment) return sendError(reply, HttpStatus.NOT_FOUND, 'Attachment not found');

    const task = await taskRepository.getById(attachment.task_id);
    if (!task) return sendError(reply, HttpStatus.NOT_FOUND, 'Task not found');

    const [orgMembership, channelMembership] = await this.getRoles(task.org_id, task.channel_id, userId);
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to remove attachments');
    }

    await attachmentService.deleteAttachment(attachmentId);
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
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'task.edit')) {
      return sendError(reply, HttpStatus.FORBIDDEN, 'Insufficient permissions to create subtasks');
    }

    const subtask = await taskService.createSubtask(parentId, { title, creator_id: userId });
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
