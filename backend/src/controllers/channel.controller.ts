// src/controllers/channel.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ChannelService } from '@/services/channel.service';
import { sendSuccess } from '@/utils/response';

const createChannelSchema = z.object({
  name: z.string().min(2, 'Channel name must be at least 2 characters'),
  org_id: z.cuid('Invalid Organization ID')
});

// 1. Navi Channel Banavvi
export const createChannel = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name, org_id } = createChannelSchema.parse(request.body);
  const user = (request as any).user;

  const channel = await ChannelService.createChannel({ name, org_id }, user.userId);

  // Socket Event
  request.server.io?.emit(`org:${org_id}:channel_created`, {
    channelId: channel.id,
    name: channel.name,
    timestamp: new Date().toISOString()
  });

  return sendSuccess(reply, channel, 'CREATE', 'Channel created successfully');
};

// 2. Organization ni badhi Channels fetch karvi
export const getOrgChannels = async (request: FastifyRequest, reply: FastifyReply) => {
  const { orgId } = request.params as { orgId: string };
  const user = (request as any).user;

  const channels = await ChannelService.getOrganizationChannels(orgId, user.userId);

  return sendSuccess(reply, channels, 'FETCH', 'Channels retrieved successfully');
};