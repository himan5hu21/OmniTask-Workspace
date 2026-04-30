import { FastifyPluginAsync } from 'fastify';
import * as channelController from '@/modules/channels/channel.controller';

const channelRoutes: FastifyPluginAsync = async (fastify) => {
  // ==========================================
  // CHANNEL ROUTES
  // ==========================================
  fastify.post('/channels', channelController.createChannel);
  fastify.get('/organizations/:orgId/channels', channelController.getOrgChannels);
  fastify.get('/channels/:id', channelController.getChannelById);
  fastify.get('/channels/:id/members', channelController.getChannelMembers);
  fastify.patch('/channels/:id', channelController.updateChannel);
  fastify.delete('/channels/:id', channelController.deleteChannel);

  // ==========================================
  // CHANNEL MEMBER ROUTES
  // ==========================================
  fastify.post('/channels/:id/members', channelController.addChannelMember);
  fastify.delete('/channels/:id/members/:userId', channelController.removeChannelMember);
  fastify.patch('/channels/:id/members/:userId', channelController.updateChannelMemberRole);
};

export default channelRoutes;
