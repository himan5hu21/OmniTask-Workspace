// src/services/channel.service.ts
import { BaseRepository } from '@/repositories/base.repository';
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';
import { prisma } from '@/lib/database';
import { PermissionGuard } from '@/utils/permissions';
import type { Server } from 'socket.io';

const channelRepo = new BaseRepository('channel');
const channelMemberRepo = new BaseRepository('channelMember', false);
const orgMemberRepo = new BaseRepository('organizationMember', false);

export class ChannelService {
  private static buildChannelPermissions(args: {
    orgRole?: string; channelRole?: string; isDefault?: boolean;
  }) {
    const { orgRole, channelRole, isDefault } = args;
    
    return {
      canEditChannel: isDefault ? PermissionGuard.canOrg(orgRole, 'org.update') : PermissionGuard.canChannel(orgRole, channelRole, 'channel.update'),
      canDeleteChannel: !isDefault && PermissionGuard.canOrg(orgRole, 'channel.delete'),
      canAddMembers: PermissionGuard.canChannel(orgRole, channelRole, 'channel.member.add'),
      canRemoveMembers: PermissionGuard.canChannel(orgRole, channelRole, 'channel.member.remove'),
      canChangeMemberRoles: PermissionGuard.canChannel(orgRole, channelRole, 'channel.member.promote'),
      canPromoteManagers: PermissionGuard.canOrg(orgRole, 'channel.update'), // Elevated task
    };
  }

  // Create new channel
  static async createChannel(channelData: { name: string; org_id: string }, creatorId: string, io?: Server) {
    const { name, org_id } = channelData;
    const existingChannel = await channelRepo.findOne({ name, org_id });
    if (existingChannel) throw new AppError('Channel name already exists in this organization', HttpStatus.BAD_REQUEST, { name: 'UNIQUE' });

    const membership = await orgMemberRepo.findOne({ organization_id: org_id, user_id: creatorId });
    if (!membership) throw new AppError('You must be a member of the organization to create channels', HttpStatus.FORBIDDEN);

    // Capability Check: channel.create
    if (!PermissionGuard.canOrg(membership.role, 'channel.create')) {
      throw new AppError('You lack the channel.create capability', HttpStatus.FORBIDDEN);
    }

    const channel = await prisma.$transaction(async (tx) => {
      const newChannel = await channelRepo.create({ name, org_id, creator_id: creatorId }, {}, tx);
      await channelMemberRepo.create({ channel_id: newChannel.id, user_id: creatorId, role: 'MANAGER' }, {}, tx);
      return newChannel;
    });

    if (io) io.to(`org:${org_id}`).emit('org:channel_created', { channelId: channel.id, name: channel.name, org_id: channel.org_id, creatorId, timestamp: new Date().toISOString() });
    return channel;
  }

  // Get all channels for an organization
  static async getOrganizationChannels(orgId: string, userId: string, options: { page?: number; limit?: number; search?: string | undefined; membership?: string | undefined } = {}) {
    const membership = await orgMemberRepo.findOne({ organization_id: orgId, user_id: userId });
    if (!membership) throw new AppError('Access denied', HttpStatus.FORBIDDEN);

    const { page = 1, limit = 12, search, membership: membershipFilter = 'ALL' } = options;
    const isOwnerOrAdmin = membership.role === 'OWNER' || membership.role === 'ADMIN';
    const memberWhere = membershipFilter === 'JOINED' ? { some: { user_id: userId } } : membershipFilter === 'MANAGED' ? { some: { user_id: userId, role: 'MANAGER' } } : undefined;

    const where: any = { org_id: orgId };
    if (!isOwnerOrAdmin) {
      where.members = { some: { user_id: userId } };
    } else if (memberWhere) {
      where.members = memberWhere;
    }

    const { data, meta } = await channelRepo.getPaginated({
      page, limit, search, searchFields: ['name'], where,
      include: {
        _count: { select: { members: true, messages: true } },
        members: { where: { user_id: userId }, select: { role: true } },
        organization: { select: { owner_id: true } }
      },
      orderBy: [{ isDefault: 'desc' }, { created_at: 'desc' }]
    });

    return {
      channels: data.map((channel: any) => {
        const currentChannelRole = channel.members[0]?.role;
        return {
          id: channel.id, name: channel.name, org_id: channel.org_id, isDefault: channel.isDefault,
          created_at: channel.created_at, updated_at: channel.updated_at, currentUserChannelRole: currentChannelRole ?? null,
          memberCount: channel._count.members, messageCount: channel._count.messages,
          permissions: this.buildChannelPermissions({
            orgRole: membership.role, channelRole: currentChannelRole, isDefault: channel.isDefault
          })
        };
      }),
      pagination: meta, currentUserOrgRole: membership.role
    };
  }

  // Get channel by ID
  static async getChannelById(channelId: string, userId: string) {
    const channel = await channelRepo.getById(channelId, {
      include: { _count: { select: { members: true, messages: true, tasks: true } }, organization: { select: { owner_id: true } } }
    });
    if (!channel) throw new AppError('Channel not found', 404);

    const channelMembership = await channelMemberRepo.findOne({ channel_id: channelId, user_id: userId });
    const orgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: userId });

    // Capability Check: channel.view
    if (!channelMembership && !PermissionGuard.canOrg(orgMembership?.role, 'channel.view')) {
      throw new AppError('You lack the channel.view capability', HttpStatus.FORBIDDEN);
    }

    const effectiveOrgRole = orgMembership?.role;
    const effectiveChannelRole = channelMembership?.role;

    return {
      ...channel, currentUserOrgRole: effectiveOrgRole ?? null, currentUserChannelRole: effectiveChannelRole ?? null,
      permissions: this.buildChannelPermissions({ orgRole: effectiveOrgRole, channelRole: effectiveChannelRole, isDefault: channel.isDefault }),
      stats: { memberCount: channel._count.members, messageCount: channel._count.messages, taskCount: channel._count.tasks }
    };
  }

  static async getChannelMembers(channelId: string, userId: string, options: { page?: number; limit?: number; search?: string | undefined; role?: string | undefined } = {}) {
    const channel = await channelRepo.getById(channelId, { include: { organization: { select: { owner_id: true } } } });
    if (!channel) throw new AppError('Channel not found', HttpStatus.NOT_FOUND);

    const orgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: userId });
    const channelMembership = await channelMemberRepo.findOne({ channel_id: channelId, user_id: userId });

    // Capability Check: channel.view
    if (!channelMembership && !PermissionGuard.canOrg(orgMembership?.role, 'channel.view')) {
      throw new AppError('You lack the channel.view capability', HttpStatus.FORBIDDEN);
    }

    const { page = 1, limit = 10, search, role } = options;
    const { data, meta } = await channelMemberRepo.getPaginated({
      page, limit, search,
      searchWhere: (term: string) => ({ OR: [{ user: { name: { contains: term, mode: 'insensitive' } } }, { user: { email: { contains: term, mode: 'insensitive' } } }] }),
      where: { channel_id: channelId, ...(role ? { role } : {}) },
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
      currentUserOrgRole: orgMembership?.role ?? null,
      currentUserChannelRole: channelMembership?.role ?? null,
      permissions: this.buildChannelPermissions({ 
        orgRole: orgMembership?.role, 
        channelRole: channelMembership?.role, 
        isDefault: channel.isDefault 
      })
    };
  }

  // Add member to channel
  static async addMember(channelId: string, userId: string, role: 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER', currentUserId: string, io?: Server) {
    const channel = await channelRepo.getById(channelId);
    if (!channel) throw new AppError('Channel not found', HttpStatus.NOT_FOUND);

    const orgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: currentUserId });
    const channelMembership = await channelMemberRepo.findOne({ channel_id: channelId, user_id: currentUserId });

    // Capability Check: channel.member.add
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'channel.member.add')) {
      throw new AppError('You lack the channel.member.add capability', HttpStatus.FORBIDDEN);
    }
      
    if (channelMembership?.role === 'MANAGER' && role === 'MANAGER') {
      throw new AppError('Channel managers can only add users as regular contributors', HttpStatus.FORBIDDEN);
    }

    if (channelMembership?.role === 'MANAGER') {
      const targetUserOrgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: userId });
      if (targetUserOrgMembership?.role === 'OWNER' || targetUserOrgMembership?.role === 'ADMIN') {
        throw new AppError('Channel managers cannot add organization owners or admins as channel members', HttpStatus.FORBIDDEN);
      }
    }

    const isOrgMember = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: userId });
    if (!isOrgMember) throw new AppError('User is not a member of this organization', HttpStatus.BAD_REQUEST);

    const existingMembership = await channelMemberRepo.findOne({ channel_id: channelId, user_id: userId });
    if (existingMembership) throw new AppError('User is already a member of this channel', HttpStatus.BAD_REQUEST);

    const newMember = await channelMemberRepo.create({ channel_id: channelId, user_id: userId, role: role });
    if (io) io.to(`channel:${channelId}`).emit('channel:member_added', { channelId, userId, role, addedBy: currentUserId, timestamp: new Date().toISOString() });
    return newMember;
  }

  // Remove member from channel
  static async removeMember(channelId: string, userIdToRemove: string, currentUserId: string, io?: Server) {
    const channel = await channelRepo.getById(channelId);
    if (!channel) throw new AppError('Channel not found', HttpStatus.NOT_FOUND);

    const orgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: currentUserId });
    const channelMembership = await channelMemberRepo.findOne({ channel_id: channelId, user_id: currentUserId });

    // Capability Check: channel.member.remove OR self-leave
    const canRemove = PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'channel.member.remove') || userIdToRemove === currentUserId;

    if (channelMembership?.role === 'MANAGER' && userIdToRemove !== currentUserId) {
      const targetUserOrgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: userIdToRemove });
      const targetUserChannelMembership = await channelMemberRepo.findOne({ channel_id: channelId, user_id: userIdToRemove });
      
      if (targetUserOrgMembership?.role === 'OWNER' || targetUserOrgMembership?.role === 'ADMIN' || targetUserChannelMembership?.role === 'MANAGER') {
        throw new AppError('Channel managers cannot remove organization owners, admins, or other managers', HttpStatus.FORBIDDEN);
      }
    }

    if (!canRemove) throw new AppError('You lack the channel.member.remove capability', HttpStatus.FORBIDDEN);

    const membershipToRemove = await channelMemberRepo.findOne({ channel_id: channelId, user_id: userIdToRemove });
    if (!membershipToRemove) throw new AppError('Member not found', HttpStatus.NOT_FOUND);

    await channelMemberRepo.delete(membershipToRemove.id);
    if (io) io.to(`channel:${channelId}`).emit('channel:member_removed', { channelId, userId: userIdToRemove, removedBy: currentUserId, timestamp: new Date().toISOString() });
    return { success: true };
  }

  // Update member role
  static async updateMemberRole(channelId: string, userId: string, newRole: 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER', currentUserId: string, io?: Server) {
    const channel = await channelRepo.getById(channelId);
    if (!channel) throw new AppError('Channel not found', HttpStatus.NOT_FOUND);

    const orgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: currentUserId });
    const channelMembership = await channelMemberRepo.findOne({ channel_id: channelId, user_id: currentUserId });

    // Capability Check: channel.member.promote
    if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'channel.member.promote')) {
      throw new AppError('You lack the channel.member.promote capability', HttpStatus.FORBIDDEN);
    }

    const targetOrgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: userId });

    // Rule: ADMIN (Org) cannot change role of OWNER (Org)
    if (orgMembership?.role === 'ADMIN' && targetOrgMembership?.role === 'OWNER') {
      throw new AppError('Admins cannot change the role of the organization owner', HttpStatus.FORBIDDEN);
    }

    // Rule: MANAGER (Channel) cannot change role of ADMIN (Org) or OWNER (Org)
    if (orgMembership?.role !== 'OWNER' && orgMembership?.role !== 'ADMIN' && channelMembership?.role === 'MANAGER') {
      if (targetOrgMembership?.role === 'ADMIN' || targetOrgMembership?.role === 'OWNER') {
        throw new AppError('Channel managers cannot change the role of organization admins or owners', HttpStatus.FORBIDDEN);
      }
    }

    const memberToUpdate = await channelMemberRepo.findOne({ channel_id: channelId, user_id: userId });
    if (!memberToUpdate) throw new AppError('Member not found', HttpStatus.NOT_FOUND);

    await channelMemberRepo.update(memberToUpdate.id, { role: newRole });
    if (io) io.to(`channel:${channelId}`).emit('channel:member_role_updated', { channelId, userId, newRole, updatedBy: currentUserId, timestamp: new Date().toISOString() });
    return { success: true };
  }

  // Update channel
  static async updateChannel(channelId: string, updateData: { name?: string }, currentUserId: string, io?: Server) {
    const channel = await channelRepo.getById(channelId);
    if (!channel) throw new AppError('Channel not found', HttpStatus.NOT_FOUND);

    const orgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: currentUserId });
    const channelMembership = await channelMemberRepo.findOne({ channel_id: channelId, user_id: currentUserId });

    if (channel.isDefault && updateData.name) {
      if (!PermissionGuard.canOrg(orgMembership?.role, 'org.update')) {
        throw new AppError('Only users with org.update capability can rename the default channel', HttpStatus.FORBIDDEN);
      }
    } else {
      // Capability Check: channel.update
      if (!PermissionGuard.canChannel(orgMembership?.role, channelMembership?.role, 'channel.update')) {
        throw new AppError('You lack the channel.update capability', HttpStatus.FORBIDDEN);
      }
    }

    if (updateData.name) {
      const existingChannel = await channelRepo.findOne({ name: updateData.name, org_id: channel.org_id });
      if (existingChannel && existingChannel.id !== channelId) throw new AppError('Channel name already exists in this organization', 400, { name: 'UNIQUE' });
    }

    const updatedChannel = await channelRepo.update(channelId, { ...updateData, updated_at: new Date() });
    if (io) io.to(`org:${channel.org_id}`).emit('org:channel_updated', { channelId: updatedChannel.id, name: updatedChannel.name, org_id: channel.org_id, updatedBy: currentUserId, timestamp: new Date().toISOString() });
    return updatedChannel;
  }

  // Delete channel
  static async deleteChannel(channelId: string, currentUserId: string, io?: Server) {
    const channel = await channelRepo.getById(channelId);
    if (!channel) throw new AppError('Channel not found', HttpStatus.NOT_FOUND);

    if (channel.isDefault) {
      throw new AppError('Cannot delete default channel. It will be deleted when the organization is deleted.', HttpStatus.BAD_REQUEST);
    }

    const orgMembership = await orgMemberRepo.findOne({ organization_id: channel.org_id, user_id: currentUserId });

    // Capability Check: channel.delete (Org level permission)
    if (!PermissionGuard.canOrg(orgMembership?.role, 'channel.delete')) {
      throw new AppError('You lack the channel.delete capability', HttpStatus.FORBIDDEN);
    }

    await prisma.$transaction(async (tx) => {
      await channelMemberRepo.delete(await channelMemberRepo.getAll({ where: { channel_id: channelId } }).then(members => members.map((member: any) => member.id)), tx);
      await channelRepo.hardDelete(channelId, tx);
    });

    if (io) io.to(`org:${channel.org_id}`).emit('org:channel_deleted', { channelId, org_id: channel.org_id, deletedBy: currentUserId, timestamp: new Date().toISOString() });
    return { success: true };
  }

  // Get user's channels across all organizations (unchanged conceptually)
  static async getUserChannels(userId: string) {
    const channels = await channelRepo.getAll({
      where: {
        OR: [
          { members: { some: { user_id: userId } } },
          { organization: { members: { some: { user_id: userId, role: { in: ['OWNER', 'ADMIN'] } } } } }
        ]
      },
      include: { organization: true, members: { where: { user_id: userId } } },
      orderBy: { created_at: 'desc' }
    });

    return channels.map((channel: any) => {
      const explicitMembership = channel.members[0];
      return {
        id: channel.id, name: channel.name,
        role: explicitMembership ? explicitMembership.role : 'INHERITED_ADMIN',
        organization: { id: channel.organization.id, name: channel.organization.name },
        created_at: channel.created_at, joined_at: explicitMembership ? explicitMembership.joined_at : channel.created_at
      };
    });
  }
}
