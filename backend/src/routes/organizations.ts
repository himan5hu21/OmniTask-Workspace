import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { HttpStatus } from '@/types/api';
import * as orgController from '@/controllers/org.controller';
import * as channelController from '@/controllers/channel.controller';
import * as messageController from '@/controllers/message.controller';

const orgRoutes: FastifyPluginAsync = async (fastify) => {

  // ==========================================
  // ORGANIZATION ROUTES
  // ==========================================
  fastify.post('/organizations', orgController.createOrganization);
  fastify.get('/organizations', orgController.getMyOrganizations);
  fastify.get('/organizations/:orgId', orgController.getOrganizationById);
  fastify.get('/organizations/:orgId/members', orgController.getOrganizationMembers);
  fastify.patch('/organizations/:orgId', orgController.updateOrganization);
  fastify.delete('/organizations/:orgId', orgController.deleteOrganization);

  // ==========================================
  // ORGANIZATION MEMBER ROUTES
  // ==========================================
  // RESTful design pattern pramane orgId params ma hase
  fastify.post('/organizations/:orgId/members', orgController.addOrganizationMember);
  fastify.patch('/organizations/:orgId/members/:userId', orgController.updateOrganizationMemberRole);
  fastify.delete('/organizations/:orgId/members/:userId', orgController.removeOrganizationMember);

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

  // ==========================================
  // CHANNEL MESSAGES ROUTES
  // ==========================================
  fastify.get('/channels/:channelId/messages', messageController.getChannelMessages);
  fastify.post('/channels/:channelId/messages', messageController.createChannelMessage);

  // TODO aagal jata: fastify.post('/channels/add-member', channelController.addChannelMember);
};

export default orgRoutes;
