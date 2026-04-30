import { FastifyPluginAsync } from 'fastify';
import * as orgController from '@/modules/organizations/org.controller';

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
};

export default orgRoutes;
