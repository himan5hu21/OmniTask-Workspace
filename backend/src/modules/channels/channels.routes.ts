import { FastifyPluginAsync } from 'fastify';
import * as channelController from '@/modules/channels/channel.controller';
import { createSchema } from '@/utils/swagger';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';


const channelRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ==========================================
  // CHANNEL ROUTES
  // ==========================================
  app.post('/channels', createSchema({
    description: 'Create a new channel',
    tags: ['Channels'],
    body: channelController.createChannelSchema,
  }), channelController.createChannel);

  app.get('/organizations/:orgId/channels', createSchema({
    description: 'Get all channels for an organization',
    tags: ['Channels'],
    params: z.object({ orgId: z.cuid() }),
    querystring: channelController.channelListQuerySchema,
  }), channelController.getOrgChannels);

  app.get('/channels/:id', createSchema({
    description: 'Get channel details by ID',
    tags: ['Channels'],
    params: z.object({ id: z.cuid() }),
  }), channelController.getChannelById);

  app.get('/channels/:id/members', createSchema({
    description: 'Get channel members',
    tags: ['Channels'],
    params: z.object({ id: z.cuid() }),
    querystring: channelController.channelMembersQuerySchema,
  }), channelController.getChannelMembers);

  app.patch('/channels/:id', createSchema({
    description: 'Update channel details',
    tags: ['Channels'],
    params: z.object({ id: z.cuid() }),
    body: channelController.updateChannelSchema,
  }), channelController.updateChannel);

  app.delete('/channels/:id', createSchema({
    description: 'Delete channel',
    tags: ['Channels'],
    params: z.object({ id: z.cuid() }),
  }), channelController.deleteChannel);


  // ==========================================
  // CHANNEL MEMBER ROUTES
  // ==========================================
  app.post('/channels/:id/members', createSchema({
    description: 'Add a member to channel',
    tags: ['Channels'],
    params: z.object({ id: z.cuid() }),
    body: channelController.addMemberSchema,
  }), channelController.addChannelMember);

  app.delete('/channels/:id/members/:userId', createSchema({
    description: 'Remove a member from channel',
    tags: ['Channels'],
    params: z.object({ id: z.cuid(), userId: z.cuid() }),
  }), channelController.removeChannelMember);

  app.patch('/channels/:id/members/:userId', createSchema({
    description: 'Update channel member role',
    tags: ['Channels'],
    params: z.object({ id: z.cuid(), userId: z.cuid() }),
    body: channelController.updateMemberRoleSchema,
  }), channelController.updateChannelMemberRole);

};

export default channelRoutes;
