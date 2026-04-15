// src/services/organization.service.ts
import { BaseRepository } from '@/respositories/base.repository';
import { AppError } from '@/utils/AppError';
import { prisma } from '@/lib/database';

const orgRepo = new BaseRepository('organization');
const orgMemberRepo = new BaseRepository('organizationMember');
const userRepo = new BaseRepository('user');

export class OrganizationService {
  // Create new organization
  static async createOrganization(orgData: { name: string }, ownerId: string) {
    const { name } = orgData;

    // Check if organization name already exists for this user
    const existingOrg = await orgRepo.findOne({ 
      name,
      owner_id: ownerId 
    });
    
    if (existingOrg) {
      throw new AppError('Validation failed', 400, { name: 'UNIQUE' });
    }

    // Use transaction to create organization and add owner as member
    const organization = await prisma.$transaction(async (tx) => {
      // Create organization
      const newOrg = await orgRepo.create(
        {
          name,
          owner_id: ownerId
        },
        {},
        tx
      );

      // Add owner as organization member
      await orgMemberRepo.create(
        {
          organization_id: newOrg.id,
          user_id: ownerId,
          role: 'OWNER'
        },
        {},
        tx
      );

      return newOrg;
    });

    return organization;
  }

  // Get user's organizations
  static async getUserOrganizations(userId: string) {
    
    const userOrgs = await orgMemberRepo.getAll({
      where: { user_id: userId },
      include: {
        organization: true
      },
      orderBy: { joined_at: 'desc' }
    });

    return userOrgs.map((member: any) => ({
      id: member.organization.id,
      name: member.organization.name,
      role: member.role,
      is_owner: member.organization.owner_id === userId,
      created_at: member.organization.created_at,
      joined_at: member.joined_at
    }));
  }

  // Get organization by ID
  static async getOrganizationById(orgId: string, userId: string) {
    // Check if user is member of the organization
    const membership = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: userId
    });

    if (!membership) {
      throw new AppError('Access denied', 403);
    }

    const organization = await orgRepo.getById(orgId, {
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    if (!organization) {
      throw new AppError('Organization not found', 404);
    }

    return organization;
  }

  // Add member to organization
  static async addMember(memberData: { email: string; org_id: string; role: 'ADMIN' | 'MEMBER' }, currentUserId: string) {
    const { email, org_id, role } = memberData;

    // Find user to add
    const userToAdd = await userRepo.findOne({ email });
    if (!userToAdd) {
      throw new AppError('User not found with this email', 404);
    }

    // Check if current user has permission to add members
    const currentUserRole = await orgMemberRepo.findOne({
      organization_id: org_id,
      user_id: currentUserId
    });

    if (!currentUserRole || (currentUserRole.role !== 'OWNER' && currentUserRole.role !== 'ADMIN')) {
      throw new AppError('You do not have permission to add members', 403);
    }

    // Add member to organization
    const newMember = await orgMemberRepo.create({
      organization_id: org_id,
      user_id: userToAdd.id,
      role: role
    });

    return newMember;
  }

  // Remove member from organization
  static async removeMember(orgId: string, userIdToRemove: string, currentUserId: string) {
    // Check if current user has permission to remove members
    const currentUserRole = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: currentUserId
    });

    if (!currentUserRole) {
      throw new AppError('Access denied', 403);
    }

    // Check if user to remove is the owner
    const org = await orgRepo.getById(orgId);
    if (org?.owner_id === userIdToRemove) {
      throw new AppError('Cannot remove organization owner', 400);
    }

    // Check if target user is admin and current user is admin (admin cannot remove admin)
    const targetUserRole = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: userIdToRemove
    });

    if (currentUserRole.role === 'ADMIN' && targetUserRole?.role === 'ADMIN') {
      throw new AppError('Admins cannot remove other admins', 403);
    }

    // Only OWNER can remove anyone, ADMIN can remove members only, and users can remove themselves
    const canRemove = 
      currentUserRole.role === 'OWNER' ||
      (currentUserRole.role === 'ADMIN' && targetUserRole?.role === 'MEMBER') ||
      userIdToRemove === currentUserId;

    if (!canRemove) {
      throw new AppError('You do not have permission to remove this member', 403);
    }

    // Remove member
    await orgMemberRepo.delete(targetUserRole.id);

    return { success: true };
  }

  // Update member role
  static async updateMemberRole(orgId: string, userId: string, newRole: 'OWNER' | 'ADMIN' | 'MEMBER', currentUserId: string) {
    // Only owner can change roles
    const org = await orgRepo.getById(orgId);
    if (org?.owner_id !== currentUserId) {
      throw new AppError('Only organization owner can change member roles', 403);
    }

    // Cannot change owner's role
    if (org.owner_id === userId) {
      throw new AppError('Cannot change organization owner role', 400);
    }

    // Update member role
    const updatedMember = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: userId
    });

    if (!updatedMember) {
      throw new AppError('Member not found', 404);
    }

    await orgMemberRepo.update(updatedMember.id, { role: newRole });

    return { success: true };
  }

  // Update organization
  static async updateOrganization(orgId: string, updateData: { name?: string }, currentUserId: string) {
    // Check if user is owner or admin
    const membership = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: currentUserId
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new AppError('Access denied', 403);
    }

    // If updating name, check if it already exists for this owner
    if (updateData.name) {
      const org = await orgRepo.getById(orgId);
      if (!org) {
        throw new AppError('Organization not found', 404);
      }

      const existingOrg = await orgRepo.findOne({ 
        name: updateData.name,
        owner_id: org.owner_id 
      });
      
      if (existingOrg && existingOrg.id !== orgId) {
        throw new AppError('Validation failed', 400, { name: 'UNIQUE' });
      }
    }

    const updatedOrg = await orgRepo.update(orgId, {
      ...updateData,
      updated_at: new Date()
    });

    return updatedOrg;
  }

  // Delete organization (only owner can delete)
  static async deleteOrganization(orgId: string, currentUserId: string) {
    const org = await orgRepo.getById(orgId);
    if (!org) {
      throw new AppError('Organization not found', 404);
    }

    if (org.owner_id !== currentUserId) {
      throw new AppError('Only organization owner can delete organization', 403);
    }

    // Use transaction to delete organization and all related data
    await prisma.$transaction(async (tx) => {
      // Delete organization members
      await orgMemberRepo.delete(
        await orgMemberRepo.getAll({ where: { organization_id: orgId } }).then(members => 
          members.map((member: any) => member.id)
        ),
        tx
      );

      // Delete organization
      await orgRepo.delete(orgId, tx);
    });

    return { success: true };
  }
}
