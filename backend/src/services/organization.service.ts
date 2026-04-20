// src/services/organization.service.ts
import { BaseRepository } from '@/repositories/base.repository'; // Typo fixed here
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';
import { prisma } from '@/lib/database';
import type { Server } from 'socket.io';

const orgRepo = new BaseRepository('organization');
const orgMemberRepo = new BaseRepository('organizationMember', false);
const userRepo = new BaseRepository('user');
const channelRepo = new BaseRepository('channel');
const channelMemberRepo = new BaseRepository('channelMember', false);

export class OrganizationService {
  private static buildOrgPermissions(role?: 'OWNER' | 'ADMIN' | 'MEMBER') {
    return {
      canEditSettings: role === 'OWNER' || role === 'ADMIN',
      canDeleteOrganization: role === 'OWNER',
      canInviteMembers: role === 'OWNER' || role === 'ADMIN',
      canChangeMemberRoles: role === 'OWNER',
      canRemoveMembers: role === 'OWNER' || role === 'ADMIN',
      canCreateChannels: role === 'OWNER' || role === 'ADMIN',
      canManageChannels: role === 'OWNER' || role === 'ADMIN',
    };
  }

  // 1. Create new organization
  static async createOrganization(orgData: { name: string }, ownerId: string, io?: Server) {
    const { name } = orgData;

    const existingOrg = await orgRepo.findOne({ 
      name,
      owner_id: ownerId 
    });
    
    if (existingOrg) {
      throw new AppError('Organization with this name already exists', 400, { name: 'UNIQUE' });
    }

    const organization = await prisma.$transaction(async (tx) => {
      const newOrg = await orgRepo.create(
        {
          name,
          owner_id: ownerId
        },
        {},
        tx
      );

      await orgMemberRepo.create(
        {
          organization_id: newOrg.id,
          user_id: ownerId,
          role: 'OWNER'
        },
        {},
        tx
      );

      // Create default channel with organization name
      const defaultChannel = await channelRepo.create(
        {
          name: name,
          org_id: newOrg.id,
          isDefault: true
        },
        {},
        tx
      );

      // Add owner as manager of default channel
      await channelMemberRepo.create(
        {
          channel_id: defaultChannel.id,
          user_id: ownerId,
          role: 'MANAGER'
        },
        {},
        tx
      );

      return newOrg;
    });

    // Emit socket event
    if (io) {
      io.emit('org:created', {
        orgId: organization.id,
        name: organization.name,
        ownerId,
        timestamp: new Date().toISOString()
      });
    }

    return organization;
  }

  // 2. Get user's organizations (FIXED FOR SOFT DELETE) 
  static async getUserOrganizations(
    userId: string,
    options: { page?: number; limit?: number; search?: string; role?: 'OWNER' | 'ADMIN' | 'MEMBER' } = {}
  ) {
    const { page = 1, limit = 12, search, role } = options;
    const { data: userOrgs, meta } = await orgMemberRepo.getPaginated({
      page,
      limit,
      search,
      searchWhere: (term: string) => ({
        organization: {
          name: { contains: term, mode: 'insensitive' }
        }
      }),
      where: { 
        user_id: userId,
        ...(role ? { role } : {}),
        // Filter memberships where the organization is NOT deleted
        organization: {
          deleted_at: null
        }
      },
      include: {
        organization: true
      },
      orderBy: { joined_at: 'desc' }
    });

    return {
      organizations: userOrgs.map((member: any) => ({
        id: member.organization.id,
        name: member.organization.name,
        role: member.role,
        is_owner: member.organization.owner_id === userId,
        created_at: member.organization.created_at,
        joined_at: member.joined_at
      })),
      pagination: meta
    };
  }

  // 3. Get organization by ID
  static async getOrganizationById(orgId: string, userId: string) {
    const membership = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: userId
    });

    if (!membership) {
      throw new AppError('Access denied. You are not a member of this organization', HttpStatus.FORBIDDEN);
    }

    const organization = await orgRepo.getById(orgId, {
      include: {
        _count: {
          select: {
            members: true,
            channels: true,
            tasks: true
          }
        }
      }
    });

    if (!organization) {
      throw new AppError('Organization not found', HttpStatus.NOT_FOUND);
    }

    return {
      ...organization,
      currentUserRole: membership.role,
      permissions: this.buildOrgPermissions(membership.role),
      stats: {
        memberCount: organization._count.members,
        channelCount: organization._count.channels,
        taskCount: organization._count.tasks
      }
    };
  }

  static async getOrganizationMembers(
    orgId: string,
    userId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      role?: 'OWNER' | 'ADMIN' | 'MEMBER';
    } = {}
  ) {
    const membership = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: userId
    });

    if (!membership) {
      throw new AppError('Access denied. You are not a member of this organization', HttpStatus.FORBIDDEN);
    }

    const { page = 1, limit = 10, search, role } = options;
    const { data, meta } = await orgMemberRepo.getPaginated({
      page,
      limit,
      search,
      searchWhere: (term: string) => ({
        OR: [
          { user: { name: { contains: term, mode: 'insensitive' } } },
          { user: { email: { contains: term, mode: 'insensitive' } } }
        ]
      }),
      where: {
        organization_id: orgId,
        ...(role ? { role } : {})
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { role: 'asc' },
        { joined_at: 'asc' }
      ]
    });

    return {
      members: data,
      pagination: meta,
      currentUserRole: membership.role,
      permissions: this.buildOrgPermissions(membership.role)
    };
  }

  // 4. Add member to organization
  static async addMember(memberData: { email: string; org_id: string; role: 'ADMIN' | 'MEMBER' }, currentUserId: string, io?: Server) {
    const { email, org_id, role } = memberData;

    const userToAdd = await userRepo.findOne({ email });
    if (!userToAdd) {
      throw new AppError('User not found with this email', HttpStatus.NOT_FOUND);
    }

    // 👈 NEW CHECK: Check if user is already a member
    const existingMember = await orgMemberRepo.findOne({
      organization_id: org_id,
      user_id: userToAdd.id
    });

    if (existingMember) {
      throw new AppError('This user is already a member of the organization', HttpStatus.BAD_REQUEST);
    }

    const currentUserRole = await orgMemberRepo.findOne({
      organization_id: org_id,
      user_id: currentUserId
    });

    if (!currentUserRole || (currentUserRole.role !== 'OWNER' && currentUserRole.role !== 'ADMIN')) {
      throw new AppError('You do not have permission to add members', HttpStatus.FORBIDDEN);
    }

    const newMember = await prisma.$transaction(async (tx) => {
      // Add member to organization
      const member = await orgMemberRepo.create(
        {
          organization_id: org_id,
          user_id: userToAdd.id,
          role: role
        },
        {},
        tx
      );

      // Find default channel and add member to it
      const defaultChannel = await channelRepo.findOne(
        { org_id, isDefault: true },
        {},
        tx
      );

      if (defaultChannel) {
        await channelMemberRepo.create(
          {
            channel_id: defaultChannel.id,
            user_id: userToAdd.id,
            role: 'MEMBER'
          },
          {},
          tx
        );
      }

      return member;
    });

    // Emit socket event
    if (io) {
      io.to(`org:${org_id}`).emit('org:member_added', {
        user_id: newMember.user_id,
        email,
        role,
        addedBy: currentUserId,
        timestamp: new Date().toISOString()
      });
    }

    return newMember;
  }

  // 5. Remove member from organization
  static async removeMember(orgId: string, userIdToRemove: string, currentUserId: string, io?: Server) {
    const currentUserRole = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: currentUserId
    });

    if (!currentUserRole) {
      throw new AppError('Access denied', HttpStatus.FORBIDDEN);
    }

    const org = await orgRepo.getById(orgId);
    if (org?.owner_id === userIdToRemove) {
      throw new AppError('Cannot remove the organization owner', HttpStatus.BAD_REQUEST);
    }

    const targetUserRole = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: userIdToRemove
    });

    if (!targetUserRole) {
      throw new AppError('User is not a member of this organization', HttpStatus.NOT_FOUND);
    }

    if (currentUserRole.role === 'ADMIN' && targetUserRole.role === 'ADMIN') {
      throw new AppError('Admins cannot remove other admins', HttpStatus.FORBIDDEN);
    }

    const canRemove = 
      currentUserRole.role === 'OWNER' ||
      (currentUserRole.role === 'ADMIN' && targetUserRole.role === 'MEMBER') ||
      userIdToRemove === currentUserId;

    if (!canRemove) {
      throw new AppError('You do not have permission to remove this member', HttpStatus.FORBIDDEN);
    }

    await prisma.$transaction(async (tx) => {
      // Remove member from organization
      await orgMemberRepo.delete(targetUserRole.id, tx);

      // Find all channels in the organization
      const allChannels = await channelRepo.getAll(
        { where: { org_id: orgId } },
        tx
      );

      // Remove user from all channels they are a member of
      for (const channel of allChannels) {
        const channelMembership = await channelMemberRepo.findOne(
          { channel_id: channel.id, user_id: userIdToRemove },
          {},
          tx
        );

        if (channelMembership) {
          await channelMemberRepo.delete(channelMembership.id, tx);
        }
      }
    });

    // Emit socket event
    if (io) {
      io.to(`org:${orgId}`).emit('org:member_removed', {
        user_id: userIdToRemove,
        removedBy: currentUserId,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true };
  }

  // 6. Update member role
  static async updateMemberRole(orgId: string, userId: string, newRole: 'OWNER' | 'ADMIN' | 'MEMBER', currentUserId: string, io?: Server) {
    const org = await orgRepo.getById(orgId);
    if (org?.owner_id !== currentUserId) {
      throw new AppError('Only the organization owner can change member roles', HttpStatus.FORBIDDEN);
    }

    if (org.owner_id === userId) {
      throw new AppError('Cannot change the organization owner role', HttpStatus.BAD_REQUEST);
    }

    const updatedMember = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: userId
    });

    if (!updatedMember) {
      throw new AppError('Member not found', HttpStatus.NOT_FOUND);
    }

    await orgMemberRepo.update(updatedMember.id, { role: newRole });

    // Emit socket event
    if (io) {
      io.to(`org:${orgId}`).emit('org:member_role_updated', {
        user_id: userId,
        newRole,
        updatedBy: currentUserId,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true };
  }

  // 7. Update organization
  static async updateOrganization(orgId: string, updateData: { name?: string }, currentUserId: string, io?: Server) {
    const membership = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: currentUserId
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new AppError('Access denied', HttpStatus.FORBIDDEN);
    }

    if (updateData.name) {
      const org = await orgRepo.getById(orgId);
      if (!org) {
        throw new AppError('Organization not found', HttpStatus.NOT_FOUND);
      }

      const existingOrg = await orgRepo.findOne({ 
        name: updateData.name,
        owner_id: org.owner_id 
      });
      
      if (existingOrg && existingOrg.id !== orgId) {
        throw new AppError('Organization with this name already exists', 400, { name: 'UNIQUE' });
      }
    }

    const updatedOrg = await orgRepo.update(orgId, {
      ...updateData,
      updated_at: new Date()
    });

    // Emit socket event
    if (io) {
      io.to(`org:${orgId}`).emit('org:updated', {
        orgId: updatedOrg.id,
        name: updatedOrg.name,
        updatedBy: currentUserId,
        timestamp: new Date().toISOString()
      });
    }

    return updatedOrg;
  }

  // 8. Delete organization (Soft Delete with Manual Cascade)
  static async deleteOrganization(orgId: string, currentUserId: string, io?: Server) {
    // 1. Fetch organization and verify existence
    const org = await orgRepo.getById(orgId);
    if (!org) {
      throw new AppError('Organization not found', HttpStatus.NOT_FOUND);
    }

    // 2. Permission check: Only the owner can delete
    if (org.owner_id !== currentUserId) {
      throw new AppError('Only the organization owner can delete the organization', HttpStatus.FORBIDDEN);
    }

    const now = new Date();

    // 3. Transactional Manual Cascade for Soft Delete
    await prisma.$transaction(async (tx) => {
      // A. Soft Delete the Organization itself
      await tx.organization.update({
        where: { id: orgId },
        data: { deleted_at: now }
      });

      // B. Soft Delete all Channels in this Organization
      await tx.channel.updateMany({
        where: { org_id: orgId, deleted_at: null },
        data: { deleted_at: now }
      });

      // C. Soft Delete all Tasks in this Organization
      await tx.task.updateMany({
        where: { org_id: orgId, deleted_at: null },
        data: { deleted_at: now }
      });

      // D. Soft Delete all Channel Messages
      await tx.channelMessage.updateMany({
        where: { 
          channel: { org_id: orgId },
          deleted_at: null 
        },
        data: { deleted_at: now }
      });

      // E. Hard Delete Pivot Relationships
      // These tables don't have deleted_at columns and should be cleaned up entirely
      // await tx.organizationMember.deleteMany({ where: { organization_id: orgId } });
      // await tx.channelMember.deleteMany({ where: { channel: { org_id: orgId } } });
      // await tx.taskAssignment.deleteMany({ where: { task: { org_id: orgId } } });
    });

    // 4. Notify via Socket
    if (io) {
      io.emit('org:deleted', {
        orgId,
        deletedBy: currentUserId,
        timestamp: now.toISOString()
      });
    }

    return { success: true };
  }

  // 9. Hard Delete organization (Permanent deletion with Prisma Cascade)
  static async hardDeleteOrganization(orgId: string, currentUserId: string, io?: Server) {
    // 1. Fetch organization and verify existence
    const org = await orgRepo.getById(orgId);
    if (!org) {
      throw new AppError('Organization not found', HttpStatus.NOT_FOUND);
    }

    // 2. Permission check: Only the owner can delete
    if (org.owner_id !== currentUserId) {
      throw new AppError('Only the organization owner can delete the organization', HttpStatus.FORBIDDEN);
    }

    // 3. Hard Delete - Prisma's onDelete: Cascade will automatically delete:
    //    - Channels
    //    - Organization Members
    //    - Tasks
    //    - Channel Messages (via channel cascade)
    //    - Channel Members (via channel cascade)
    //    - Task Assignments (via task cascade)
    await orgRepo.hardDelete(orgId);

    // 4. Emit socket event
    if (io) {
      io.emit('org:deleted', {
        orgId,
        deletedBy: currentUserId,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true };
  }

  
}
