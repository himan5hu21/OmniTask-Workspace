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

const addOrgMemberSchema = z.object({
  email: z.email('Valid email is required'),
  org_id: z.cuid('Invalid Organization ID'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER')
});

// 1. Navi Organization Banavvi
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

// 2. Mara (Current User) na badha Organizations fetch karva
export const getMyOrganizations = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;

  const myOrgs = await OrganizationService.getUserOrganizations(user.userId);

  return sendSuccess(reply, myOrgs, 'FETCH', 'Organizations retrieved successfully');
};

export const addOrganizationMember = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email, org_id, role } = addOrgMemberSchema.parse(request.body);
  const currentUser = (request as any).user;

  const newMember = await OrganizationService.addMember({ email, org_id, role }, currentUser.userId);

  // Socket Event: Nava member ne live update aapo
  request.server.io?.emit(`org:${org_id}:member_added`, {
    user_id: newMember.user_id,
    email: email,
    role: role
  });

  return sendSuccess(reply, newMember, 'CREATE', 'Member added to organization successfully');
};