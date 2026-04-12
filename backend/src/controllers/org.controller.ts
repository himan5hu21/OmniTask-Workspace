// src/controllers/org.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { OrganizationService } from '@/services/organization.service';
import { AppError } from '@/utils/AppError';
import { sendSuccess } from '@/utils/response';

// Validation Schema
const createOrgSchema = z.object({
  name: z.string().min(3, 'Organization name must be at least 3 characters')
});

const updateOrgSchema = z.object({
  name: z.string().min(3, 'Organization name must be at least 3 characters').optional()
});

const addOrgMemberSchema = z.object({
  email: z.email('Valid email is required'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER')
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER'])
});

const orgIdParamSchema = z.object({
  orgId: z.cuid('Invalid Organization ID')
});

const orgMemberParamSchema = z.object({
  orgId: z.cuid('Invalid Organization ID'),
  userId: z.cuid('Invalid User ID')
});

// 1. Create Organization
export const createOrganization = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name } = createOrgSchema.parse(request.body);
  const user = (request as any).user;

  const organization = await OrganizationService.createOrganization({ name }, user.userId);

  // Socket Event: Client ne live update aapo
  request.server.io?.emit('org:created', {
    orgId: organization.id,
    name: organization.name,
    ownerId: user.userId,
    timestamp: new Date().toISOString()
  });

  return sendSuccess(reply, organization, 'CREATE', 'Organization created successfully');
};

// 2. Get My Organizations
export const getMyOrganizations = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;

  const myOrgs = await OrganizationService.getUserOrganizations(user.userId);

  return sendSuccess(reply, myOrgs, 'FETCH', 'Organizations retrieved successfully');
};

// 3. Get Single Organization By ID
export const getOrganizationById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { orgId } = orgIdParamSchema.parse((request as any).params);
  const user = (request as any).user;

  const organization = await OrganizationService.getOrganizationById(orgId, user.userId);
  return sendSuccess(reply, organization, 'FETCH', 'Organization details retrieved successfully');
};

// 4. Update Organization
export const updateOrganization = async (request: FastifyRequest, reply: FastifyReply) => {
  const { orgId } = orgIdParamSchema.parse((request as any).params);
  const data = updateOrgSchema.parse(request.body);
  const user = (request as any).user;

  // Filter out undefined values for exactOptionalPropertyTypes compatibility
  const updateData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  const updatedOrg = await OrganizationService.updateOrganization(orgId, updateData, user.userId);

  // Socket: Update event fire karo
  request.server.io?.emit(`org:${orgId}:updated`, {
    orgId: updatedOrg.id,
    name: updatedOrg.name
  });

  return sendSuccess(reply, updatedOrg, 'UPDATE', 'Organization updated successfully');
};

// 5. Delete Organization
export const deleteOrganization = async (request: FastifyRequest, reply: FastifyReply) => {
  const { orgId } = orgIdParamSchema.parse((request as any).params);
  const user = (request as any).user;

  await OrganizationService.deleteOrganization(orgId, user.userId);

  // Socket: Delete event fire karo jethi clients redirect thai sake
  request.server.io?.emit(`org:${orgId}:deleted`, { orgId });

  return sendSuccess(reply, null, 'DELETE', 'Organization deleted successfully');
};

// 6. Add Member to Organization
export const addOrganizationMember = async (request: FastifyRequest, reply: FastifyReply) => {
  const { orgId } = orgIdParamSchema.parse((request as any).params);
  const { email, role } = addOrgMemberSchema.parse(request.body);
  const currentUser = (request as any).user;

  const newMember = await OrganizationService.addMember({ email, org_id: orgId, role }, currentUser.userId);

  // Socket Event: Nava member ne live update aapo
  request.server.io?.emit(`org:${orgId}:member_added`, {
    user_id: newMember.user_id,
    email: email,
    role: role
  });

  return sendSuccess(reply, newMember, 'CREATE', 'Member added to organization successfully');
};

// 7. Update Member Role
export const updateOrganizationMemberRole = async (request: FastifyRequest, reply: FastifyReply) => {
  const { orgId, userId } = orgMemberParamSchema.parse((request as any).params);
  const { role } = updateMemberRoleSchema.parse(request.body);
  const currentUser = (request as any).user;

  await OrganizationService.updateMemberRole(orgId, userId, role, currentUser.userId);

  request.server.io?.emit(`org:${orgId}:member_updated`, {
    user_id: userId,
    new_role: role
  });

  return sendSuccess(reply, null, 'UPDATE', 'Member role updated successfully');
};

// 8. Remove Member
export const removeOrganizationMember = async (request: FastifyRequest, reply: FastifyReply) => {
  const { orgId, userId } = orgMemberParamSchema.parse((request as any).params);
  const currentUser = (request as any).user;

  await OrganizationService.removeMember(orgId, userId, currentUser.userId);

  request.server.io?.emit(`org:${orgId}:member_removed`, {
    user_id: userId
  });

  return sendSuccess(reply, null, 'DELETE', 'Member removed successfully');
};