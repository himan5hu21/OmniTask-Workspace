// src/controllers/channel.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ChannelService } from '@/modules/channels/channel.service';
import { sendSuccess } from '@/utils/response';

export const createChannelSchema = z.object({
  name: z.string().min(2, 'Channel name must be at least 2 characters'),
  org_id: z.cuid('Invalid Organization ID')
});



export const channelListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: z.string().trim().optional(),
  membership: z.enum(['ALL', 'JOINED', 'MANAGED']).default('ALL')
});


export const channelMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  role: z.enum(['MANAGER', 'CONTRIBUTOR', 'VIEWER']).optional()
});


// 1. Navi Channel Banavvi
export const createChannel = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name, org_id } = createChannelSchema.parse(request.body);
  const user = (request as any).user;

  const channel = await ChannelService.createChannel({ name, org_id }, user.userId, request.server.io);

  return sendSuccess(reply, channel, 'CREATE', 'Channel created successfully');
};

// 2. Organization ni badhi Channels fetch karvi
export const getOrgChannels = async (request: FastifyRequest, reply: FastifyReply) => {
  const { orgId } = request.params as { orgId: string };
  const user = (request as any).user;
  const query = channelListQuerySchema.parse(request.query ?? {});

  const channels = await ChannelService.getOrganizationChannels(orgId, user.userId, query);

  return sendSuccess(reply, channels, 'FETCH', 'Channels retrieved successfully');
};

// 3. Single Channel by ID fetch karvi
export const getChannelById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const user = (request as any).user;

  const channel = await ChannelService.getChannelById(id, user.userId);

  return sendSuccess(reply, channel, 'FETCH', 'Channel retrieved successfully');
};

export const getChannelMembers = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const user = (request as any).user;
  const query = channelMembersQuerySchema.parse(request.query ?? {});

  const members = await ChannelService.getChannelMembers(id, user.userId, query);

  return sendSuccess(reply, members, 'FETCH', 'Channel members retrieved successfully');
};

export const updateChannelSchema = z.object({
  name: z.string().min(2, 'Channel name must be at least 2 characters').optional()
});


// 4. Channel update karvi
export const updateChannel = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const updateData = updateChannelSchema.parse(request.body);
  const user = (request as any).user;

  // Filter out undefined values to satisfy exactOptionalPropertyTypes
  const cleanUpdateData = Object.fromEntries(
    Object.entries(updateData).filter(([_, v]) => v !== undefined)
  );

  const channel = await ChannelService.updateChannel(id, cleanUpdateData, user.userId, request.server.io);

  return sendSuccess(reply, channel, 'UPDATE', 'Channel updated successfully');
};

// 5. Channel delete karvi
export const deleteChannel = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const user = (request as any).user;

  const result = await ChannelService.deleteChannel(id, user.userId, request.server.io);

  return sendSuccess(reply, result, 'DELETE', 'Channel deleted successfully');
};

export const addMemberSchema = z.object({
  user_id: z.cuid('Invalid User ID'),
  role: z.enum(['MANAGER', 'CONTRIBUTOR', 'VIEWER']).default('CONTRIBUTOR')
});



// 6. Channel ma member add karvi
export const addChannelMember = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string };
  const { user_id, role } = addMemberSchema.parse(request.body);
  const user = (request as any).user;

  const member = await ChannelService.addMember(id, user_id, role, user.userId, request.server.io);

  return sendSuccess(reply, member, 'CREATE', 'Member added to channel successfully');
};

// 7. Channel thi member remove karvi
export const removeChannelMember = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id, userId } = request.params as { id: string; userId: string };
  const user = (request as any).user;

  const result = await ChannelService.removeMember(id, userId, user.userId, request.server.io);

  return sendSuccess(reply, result, 'DELETE', 'Member removed from channel successfully');
};

export const updateMemberRoleSchema = z.object({
  role: z.enum(['MANAGER', 'CONTRIBUTOR', 'VIEWER'])
});


// 8. Channel member ni role update karvi
export const updateChannelMemberRole = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id, userId } = request.params as { id: string; userId: string };
  const { role } = updateMemberRoleSchema.parse(request.body);
  const user = (request as any).user;

  const result = await ChannelService.updateMemberRole(id, userId, role, user.userId, request.server.io);

  return sendSuccess(reply, result, 'UPDATE', 'Member role updated successfully');
};
