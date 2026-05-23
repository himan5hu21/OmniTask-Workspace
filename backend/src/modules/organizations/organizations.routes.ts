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


  // ==========================================
  // ORGANIZATION INVITATION ROUTES
  // ==========================================
  // Note: /invitations/accept and /invitations/status must be registered BEFORE /:orgId wildcards
  app.get('/organizations/invitations/status', {
    ...createSchema({
      description: 'Verify invitation token status and check if user has an account',
      tags: ['Organizations'],
      querystring: orgController.getInvitationStatusSchema,
    }),
    config: { isPublic: true }
  }, orgController.getInvitationStatus);

  app.post('/organizations/invitations/accept', createSchema({
    description: 'Accept an organization invitation token',
    tags: ['Organizations'],
    body: orgController.acceptInvitationSchema,
  }), orgController.acceptInvitation);

  app.post('/organizations/:orgId/invitations', createSchema({
    description: 'Generate an invitation link for an organization',
    tags: ['Organizations'],
    params: orgController.orgIdParamSchema,
    body: orgController.generateInvitationSchema,
  }), orgController.generateInvitation);

};

export default orgRoutes;
