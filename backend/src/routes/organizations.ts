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

  const addMemberSchema = z.object({
    user_id: z.uuid(),
    channel_id: z.uuid(),
    role: z.enum(['MANAGER', 'MEMBER']).default('MEMBER'),
  });

  // Add member to channel
  fastify.post('/channels/members', async (request, reply) => {
    try {
      const { user_id, channel_id, role } = addMemberSchema.parse(request.body);

      // TODO: Add Prisma channel member creation
      // const member = await prisma.channelMember.create({
      //   data: {
      //     user_id,
      //     channel_id,
      //     role,
      //   },
      // });

      return reply.status(HttpStatus.CREATED).send({
        message: 'Member added to channel successfully',
        // member
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(HttpStatus.BAD_REQUEST).send({ error: 'Failed to add member to channel' });
    }
  });

  // ==========================================
  // CHANNEL MESSAGES ROUTES
  // ==========================================
  fastify.get('/channels/:channelId/messages', messageController.getChannelMessages);
  fastify.post('/channels/:channelId/messages', messageController.createChannelMessage);

  // TODO aagal jata: fastify.post('/channels/add-member', channelController.addChannelMember);
};

export default orgRoutes;
