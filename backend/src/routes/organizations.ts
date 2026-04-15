import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as orgController from '@/controllers/org.controller';
import * as channelController from '@/controllers/channel.controller';

const orgRoutes: FastifyPluginAsync = async (fastify) => {
  const addMemberSchema = z.object({
    user_id: z.uuid(),
    channel_id: z.uuid(),
    role: z.enum(['MANAGER', 'MEMBER']).default('MEMBER'),
  });

  // Create organization
  fastify.post('/organizations', orgController.createOrganization);

  // Get user's organizations
  fastify.get('/organizations', orgController.getMyOrganizations);
  fastify.post('/organizations/add-member', orgController.addOrganizationMember);

  // Create channel
  fastify.post('/channels', channelController.createChannel);

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

      return reply.status(201).send({
        message: 'Member added to channel successfully',
        // member
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: 'Failed to add member to channel' });
    }
  });

  // Get channels in an organization
  fastify.get('/organizations/:orgId/channels', channelController.getOrgChannels);

  // TODO aagal jata: fastify.post('/channels/add-member', channelController.addChannelMember);
};

export default orgRoutes;
