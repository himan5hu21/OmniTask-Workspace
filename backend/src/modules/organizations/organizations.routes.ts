import { FastifyPluginAsync } from 'fastify';
import * as orgController from '@/modules/organizations/org.controller';
import { createSchema } from '@/utils/swagger';
import { ZodTypeProvider } from 'fastify-type-provider-zod';


const orgRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();


  // ==========================================
  // ORGANIZATION ROUTES
  // ==========================================
  app.post('/organizations', createSchema({
    description: 'Create a new organization',
    tags: ['Organizations'],
    body: orgController.createOrgSchema,
  }), orgController.createOrganization);

  app.get('/organizations', createSchema({
    description: 'Get list of organizations for current user',
    tags: ['Organizations'],
    querystring: orgController.organizationListQuerySchema,
  }), orgController.getMyOrganizations);

  app.get('/organizations/:orgId', createSchema({
    description: 'Get organization details by ID',
    tags: ['Organizations'],
    params: orgController.orgIdParamSchema,
  }), orgController.getOrganizationById);

  app.get('/organizations/:orgId/members', createSchema({
    description: 'Get organization members',
    tags: ['Organizations'],
    params: orgController.orgIdParamSchema,
    querystring: orgController.organizationMembersQuerySchema,
  }), orgController.getOrganizationMembers);

  app.patch('/organizations/:orgId', createSchema({
    description: 'Update organization details',
    tags: ['Organizations'],
    params: orgController.orgIdParamSchema,
    body: orgController.updateOrgSchema,
  }), orgController.updateOrganization);

  app.delete('/organizations/:orgId', createSchema({
    description: 'Delete organization',
    tags: ['Organizations'],
    params: orgController.orgIdParamSchema,
  }), orgController.deleteOrganization);


  // ==========================================
  // ORGANIZATION MEMBER ROUTES
  // ==========================================
  // RESTful design pattern pramane orgId params ma hase
  app.post('/organizations/:orgId/members', createSchema({
    description: 'Add a new member to organization',
    tags: ['Organizations'],
    params: orgController.orgIdParamSchema,
    body: orgController.addOrgMemberSchema,
  }), orgController.addOrganizationMember);

  app.patch('/organizations/:orgId/members/:userId', createSchema({
    description: 'Update member role in organization',
    tags: ['Organizations'],
    params: orgController.orgMemberParamSchema,
    body: orgController.updateMemberRoleSchema,
  }), orgController.updateOrganizationMemberRole);

  app.delete('/organizations/:orgId/members/:userId', createSchema({
    description: 'Remove member from organization',
    tags: ['Organizations'],
    params: orgController.orgMemberParamSchema,
  }), orgController.removeOrganizationMember);

};

export default orgRoutes;
