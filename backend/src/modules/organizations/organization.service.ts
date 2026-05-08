// src/services/organization.service.ts
import { BaseRepository } from '@/repositories/base.repository'; 
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';
import { prisma } from '@/lib/database';
import { PermissionGuard } from '@/utils/permissions';
import type { Server } from 'socket.io';

const orgRepo = new BaseRepository('organization');
const orgMemberRepo = new BaseRepository('organizationMember', false);
const userRepo = new BaseRepository('user');
const channelRepo = new BaseRepository('channel');
const channelMemberRepo = new BaseRepository('channelMember', false);

export class OrganizationService {
  private static buildOrgPermissions(role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST') {
    return {
      canEditSettings: PermissionGuard.canOrg(role, 'settings.manage'),
      canDeleteOrganization: PermissionGuard.canOrg(role, 'org.delete'),
      canInviteMembers: PermissionGuard.canOrg(role, 'member.invite'),
      canChangeMemberRoles: PermissionGuard.canOrg(role, 'member.role.change'),
      canRemoveMembers: PermissionGuard.canOrg(role, 'member.remove'),
      canCreateChannels: PermissionGuard.canOrg(role, 'channel.create'),
      canManageChannels: PermissionGuard.canOrg(role, 'channel.update'),
    };
  }

  // 1. Create new organization
  static async createOrganization(orgData: { name: string }, ownerId: string, io?: Server) {
    const { name } = orgData;

    const existingOrg = await orgRepo.findOne({ name, owner_id: ownerId });
    if (existingOrg) throw new AppError('Organization with this name already exists', 400, { name: 'UNIQUE' });

    const organization = await prisma.$transaction(async (tx) => {
      const newOrg = await orgRepo.create({ name, owner_id: ownerId }, {}, tx);
      await orgMemberRepo.create({ organization_id: newOrg.id, user_id: ownerId, role: 'OWNER' }, {}, tx);

      const defaultChannel = await channelRepo.create({ name: name, org_id: newOrg.id, isDefault: true }, {}, tx);
      await channelMemberRepo.create({ channel_id: defaultChannel.id, user_id: ownerId, role: 'MANAGER' }, {}, tx);

      return newOrg;
    });

    if (io) {
      io.emit('org:created', { orgId: organization.id, name: organization.name, ownerId, timestamp: new Date().toISOString() });
    }
    return organization;
  }

  // 2. Get user's organizations
  static async getUserOrganizations(userId: string, options: { page?: number; limit?: number; search?: string | undefined; role?: string | undefined } = {}) {
    const { page = 1, limit = 12, search, role } = options;
    const { data: userOrgs, meta } = await orgMemberRepo.getPaginated({
      page, limit, search,
      searchWhere: (term: string) => ({ organization: { name: { contains: term, mode: 'insensitive' } } }),
      where: { user_id: userId, ...(role ? { role } : {}), organization: { deleted_at: null } },
      include: { organization: true },
      orderBy: { joined_at: 'desc' }
    });

    return {
      organizations: userOrgs.map((member: any) => ({
        id: member.organization.id,
        name: member.organization.name,
        currentUserRole: member.role,
        is_owner: member.organization.owner_id === userId,
        created_at: member.organization.created_at,
        joined_at: member.joined_at
      })),
      pagination: meta
    };
  }

  // 3. Get organization by ID
  static async getOrganizationById(orgId: string, userId: string) {
    const membership = await orgMemberRepo.findOne({ organization_id: orgId, user_id: userId });
    if (!membership) throw new AppError('Access denied. You are not a member of this organization', HttpStatus.FORBIDDEN);

    const organization = await orgRepo.getById(orgId, { include: { _count: { select: { members: true, channels: true, tasks: true } } } });
    if (!organization) throw new AppError('Organization not found', HttpStatus.NOT_FOUND);

    return {
      ...organization, currentUserRole: membership.role,
      permissions: this.buildOrgPermissions(membership.role as any),
      stats: { memberCount: organization._count.members, channelCount: organization._count.channels, taskCount: organization._count.tasks }
    };
  }

  static async getOrganizationMembers(orgId: string, userId: string, options: { page?: number; limit?: number; search?: string | undefined; role?: string | undefined } = {}) {
    const membership = await orgMemberRepo.findOne({ organization_id: orgId, user_id: userId });
    if (!membership) throw new AppError('Access denied. You are not a member of this organization', HttpStatus.FORBIDDEN);

    const { page = 1, limit = 10, search, role } = options;
    const { data, meta } = await orgMemberRepo.getPaginated({
      page, limit, search,
      searchWhere: (term: string) => ({ OR: [{ user: { name: { contains: term, mode: 'insensitive' } } }, { user: { email: { contains: term, mode: 'insensitive' } } }] }),
      where: { organization_id: orgId, ...(role ? { role } : {}) },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ role: 'asc' }, { joined_at: 'asc' }]
    });

    return { 
      members: data.map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        name: m.user.name,
        email: m.user.email
      })), 
      pagination: meta, 
      currentUserRole: membership.role, 
      permissions: this.buildOrgPermissions(membership.role as any) 
    };
  }

  // 4. Add member to organization
  static async addMember(memberData: { email: string; org_id: string; role: 'ADMIN' | 'MEMBER' | 'GUEST' }, currentUserId: string, io?: Server) {
    const { email, org_id, role } = memberData;
    const userToAdd = await userRepo.findOne({ email });
    if (!userToAdd) throw new AppError('User not found with this email', HttpStatus.NOT_FOUND);

    const existingMember = await orgMemberRepo.findOne({ organization_id: org_id, user_id: userToAdd.id });
    if (existingMember) throw new AppError('This user is already a member of the organization', HttpStatus.BAD_REQUEST);

    const currentUserRole = await orgMemberRepo.findOne({ organization_id: org_id, user_id: currentUserId });
    
    // Capability Check: member.invite
    if (!PermissionGuard.canOrg(currentUserRole?.role, 'member.invite')) {
      throw new AppError('You do not have permission to invite members', HttpStatus.FORBIDDEN);
    }

    const newMember = await prisma.$transaction(async (tx) => {
      const member = await orgMemberRepo.create({ organization_id: org_id, user_id: userToAdd.id, role: role }, {}, tx);
      const defaultChannel = await channelRepo.findOne({ org_id, isDefault: true }, {}, tx);
      if (defaultChannel) {
        // Map OrgRole to ChannelRole
        const channelRole = role === 'ADMIN' ? 'MANAGER' : (role === 'GUEST' ? 'VIEWER' : 'CONTRIBUTOR');
        await channelMemberRepo.create({ 
          channel_id: defaultChannel.id, 
          user_id: userToAdd.id, 
          role: channelRole 
        }, {}, tx);
      }
      return member;
    });

    if (io) io.to(`org:${org_id}`).emit('org:member_added', { user_id: newMember.user_id, email, role, addedBy: currentUserId, timestamp: new Date().toISOString() });
    return newMember;
  }

  // 5. Remove member from organization
  static async removeMember(orgId: string, userIdToRemove: string, currentUserId: string, io?: Server) {
    const currentUserRole = await orgMemberRepo.findOne({ organization_id: orgId, user_id: currentUserId });
    if (!currentUserRole) throw new AppError('Access denied', HttpStatus.FORBIDDEN);

    const org = await orgRepo.getById(orgId);
    if (org?.owner_id === userIdToRemove) throw new AppError('Cannot remove the organization owner', HttpStatus.BAD_REQUEST);

    const targetUserRole = await orgMemberRepo.findOne({ organization_id: orgId, user_id: userIdToRemove });
    if (!targetUserRole) throw new AppError('User is not a member of this organization', HttpStatus.NOT_FOUND);

    // Explicit Rule: ADMIN cannot remove ADMIN/OWNER
    if (currentUserRole.role === 'ADMIN' && targetUserRole.role === 'ADMIN') {
      throw new AppError('Admins cannot remove other admins', HttpStatus.FORBIDDEN);
    }

    // Capability Check: member.remove OR Self-removal
    const canRemove = PermissionGuard.canOrg(currentUserRole.role, 'member.remove') || userIdToRemove === currentUserId;
    if (!canRemove) throw new AppError('You lack the member.remove capability', HttpStatus.FORBIDDEN);

    await prisma.$transaction(async (tx) => {
      await orgMemberRepo.delete(targetUserRole.id, tx);
      const allChannels = await channelRepo.getAll({ where: { org_id: orgId } }, tx);
      for (const channel of allChannels) {
        const channelMembership = await channelMemberRepo.findOne({ channel_id: channel.id, user_id: userIdToRemove }, {}, tx);
        if (channelMembership) await channelMemberRepo.delete(channelMembership.id, tx);
      }
    });

    if (io) io.to(`org:${orgId}`).emit('org:member_removed', { user_id: userIdToRemove, removedBy: currentUserId, timestamp: new Date().toISOString() });
    return { success: true };
  }

  // 6. Update member role
  static async updateMemberRole(orgId: string, userId: string, newRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST', currentUserId: string, io?: Server) {
    const currentUserRole = await orgMemberRepo.findOne({ organization_id: orgId, user_id: currentUserId });
    
    // Capability Check: member.role.change
    if (!PermissionGuard.canOrg(currentUserRole?.role, 'member.role.change')) {
      throw new AppError('You lack the member.role.change capability', HttpStatus.FORBIDDEN);
    }

    // Role Rule: Cannot change anyone TO owner via this method
    if (newRole === 'OWNER') {
      throw new AppError('Cannot assign the OWNER role via update', HttpStatus.BAD_REQUEST);
    }

    const org = await orgRepo.getById(orgId);
    if (!org) throw new AppError('Organization not found', HttpStatus.NOT_FOUND);

    // Role Rule: Cannot change the primary owner's role (Source of Truth)
    if (org.owner_id === userId) {
      throw new AppError('Cannot change the organization owner role', HttpStatus.BAD_REQUEST);
    }

    const updatedMember = await orgMemberRepo.findOne({ organization_id: orgId, user_id: userId });
    if (!updatedMember) throw new AppError('Member not found', HttpStatus.NOT_FOUND);

    // Role Rule: Cannot change the role of anyone who currently HAS the owner role
    if (updatedMember.role === 'OWNER') {
      throw new AppError('Cannot change the role of an organization owner', HttpStatus.BAD_REQUEST);
    }

    await orgMemberRepo.update(updatedMember.id, { role: newRole });

    if (io) io.to(`org:${orgId}`).emit('org:member_role_updated', { user_id: userId, newRole, updatedBy: currentUserId, timestamp: new Date().toISOString() });
    return { success: true };
  }

  // 7. Update organization
  static async updateOrganization(orgId: string, updateData: { name?: string }, currentUserId: string, io?: Server) {
    const membership = await orgMemberRepo.findOne({ organization_id: orgId, user_id: currentUserId });

    // Capability Check: org.update
    if (!PermissionGuard.canOrg(membership?.role, 'org.update')) {
      throw new AppError('You lack the org.update capability', HttpStatus.FORBIDDEN);
    }

    if (updateData.name) {
      const org = await orgRepo.getById(orgId);
      if (!org) throw new AppError('Organization not found', HttpStatus.NOT_FOUND);
      const existingOrg = await orgRepo.findOne({ name: updateData.name, owner_id: org.owner_id });
      if (existingOrg && existingOrg.id !== orgId) throw new AppError('Organization with this name already exists', 400, { name: 'UNIQUE' });
    }

    const updatedOrg = await orgRepo.update(orgId, { ...updateData, updated_at: new Date() });

    if (io) io.to(`org:${orgId}`).emit('org:updated', { orgId: updatedOrg.id, name: updatedOrg.name, updatedBy: currentUserId, timestamp: new Date().toISOString() });
    return updatedOrg;
  }

  // 8. Delete organization
  static async deleteOrganization(orgId: string, currentUserId: string, io?: Server) {
    const membership = await orgMemberRepo.findOne({ organization_id: orgId, user_id: currentUserId });
    
    // Capability Check: org.delete
    if (!PermissionGuard.canOrg(membership?.role, 'org.delete')) {
      throw new AppError('You lack the org.delete capability to remove this organization', HttpStatus.FORBIDDEN);
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.organization.update({ where: { id: orgId }, data: { deleted_at: now } });
      await tx.channel.updateMany({ where: { org_id: orgId, deleted_at: null }, data: { deleted_at: now } });
      await tx.task.updateMany({ where: { org_id: orgId, deleted_at: null }, data: { deleted_at: now } });
      await tx.channelMessage.updateMany({ where: { channel: { org_id: orgId }, deleted_at: null }, data: { deleted_at: now } });
    });

    if (io) io.emit('org:deleted', { orgId, deletedBy: currentUserId, timestamp: now.toISOString() });
    return { success: true };
  }

  // 9. Hard Delete organization
  static async hardDeleteOrganization(orgId: string, currentUserId: string, io?: Server) {
    const membership = await orgMemberRepo.findOne({ organization_id: orgId, user_id: currentUserId });
    
    // Capability Check: org.delete
    if (!PermissionGuard.canOrg(membership?.role, 'org.delete')) {
      throw new AppError('You lack the org.delete capability to hard-delete this organization', HttpStatus.FORBIDDEN);
    }

    // 3. Hard Delete - Prisma's onDelete: Cascade will automatically delete:
    //    - Channels
    //    - Organization Members
    //    - Tasks
    //    - Channel Messages (via channel cascade)
    //    - Channel Members (via channel cascade)
    //    - Task Assignments (via task cascade)
    await orgRepo.hardDelete(orgId);
    if (io) io.emit('org:deleted', { orgId, deletedBy: currentUserId, timestamp: new Date().toISOString() });
    return { success: true };
  }
}
