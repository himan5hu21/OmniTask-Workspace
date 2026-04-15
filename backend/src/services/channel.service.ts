// src/services/channel.service.ts
import { BaseRepository } from '@/respositories/base.repository';
import { AppError } from '@/utils/AppError';
import { prisma } from '@/lib/database';

const channelRepo = new BaseRepository('channel');
const channelMemberRepo = new BaseRepository('channelMember');
const orgMemberRepo = new BaseRepository('organizationMember');

export class ChannelService {
  // Create new channel
  static async createChannel(channelData: { name: string; org_id: string }, creatorId: string) {
    const { name, org_id } = channelData;

    // Check if channel name already exists in this organization
    const existingChannel = await channelRepo.findOne({ 
      name,
      org_id 
    });
    
    if (existingChannel) {
      throw new AppError('Channel name already exists in this organization', 400, { name: 'UNIQUE' });
    }

    // Check if user is member of the organization and get their role
    const membership = await orgMemberRepo.findOne({
      organization_id: org_id,
      user_id: creatorId
    });

    if (!membership) {
      throw new AppError('You must be a member of the organization to create channels', 403);
    }

    // Only OWNER and ADMIN can create channels
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      throw new AppError('Only organization owners and admins can create channels', 403);
    }

    // Use transaction to create channel and add creator as manager
    const channel = await prisma.$transaction(async (tx) => {
      // Create channel
      const newChannel = await channelRepo.create(
        { name, org_id },
        {},
        tx
      );

      // Add creator as MANAGER
      await channelMemberRepo.create(
        {
          channel_id: newChannel.id,
          user_id: creatorId,
          role: 'MANAGER'
        },
        {},
        tx
      );

      return newChannel;
    });

    return channel;
  }

  // Get all channels for an organization
  static async getOrganizationChannels(orgId: string, userId: string) {
    // Check if user is member of the organization
    const isMember = await orgMemberRepo.findOne({
      organization_id: orgId,
      user_id: userId
    });

    if (!isMember) {
      throw new AppError('Access denied', 403);
    }

    const channels = await channelRepo.getAll({
      where: { org_id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return channels;
  }

  // Get channel by ID
  static async getChannelById(channelId: string, userId: string) {
    const channel = await channelRepo.getById(channelId, {
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } }
      }
    });

    if (!channel) throw new AppError('Channel not found', 404);

    // Check if user is member of the channel
    const channelMembership = await channelMemberRepo.findOne({
      channel_id: channelId,
      user_id: userId
    });

    if (!channelMembership) {
      const orgMembership = await orgMemberRepo.findOne({
        organization_id: channel.org_id,
        user_id: userId
      });

      if (orgMembership?.role !== 'OWNER' && orgMembership?.role !== 'ADMIN') {
        throw new AppError('Access denied', 403);
      }
    }

    return channel;
  }

  // Add member to channel
  static async addMember(channelId: string, userId: string, role: 'MANAGER' | 'MEMBER', currentUserId: string) {
    // Get channel to check organization
    const channel = await channelRepo.getById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    // Check if current user is org owner/admin or channel manager
    const orgMembership = await orgMemberRepo.findOne({
      organization_id: channel.org_id,
      user_id: currentUserId
    });

    const channelMembership = await channelMemberRepo.findOne({
      channel_id: channelId,
      user_id: currentUserId
    });

    const canAddMember = 
      orgMembership?.role === 'OWNER' ||
      orgMembership?.role === 'ADMIN' ||
      channelMembership?.role === 'MANAGER';

    if (!canAddMember) {
      throw new AppError('Only organization owners, admins, or channel managers can add members', 403);
    }
      
    if (channelMembership?.role === 'MANAGER' && role === 'MANAGER') {
      throw new AppError('Channel managers can only add users as regular MEMBERs', 403);
    }

    // Additional check: prevent managers from adding owners/admins
    if (channelMembership?.role === 'MANAGER') {
      const targetUserOrgMembership = await orgMemberRepo.findOne({
        organization_id: channel.org_id,
        user_id: userId
      });

      if (targetUserOrgMembership?.role === 'OWNER' || 
          targetUserOrgMembership?.role === 'ADMIN') {
        throw new AppError('Channel managers cannot add organization owners or admins as channel members', 403);
      }
    }

    const isOrgMember = await orgMemberRepo.findOne({
      organization_id: channel.org_id,
      user_id: userId
    });

    if (!isOrgMember) {
      throw new AppError('User is not a member of this organization', 400);
    }

    // Check if user is already a member of the channel
    const existingMembership = await channelMemberRepo.findOne({
      channel_id: channelId,
      user_id: userId
    });

    if (existingMembership) {
      throw new AppError('User is already a member of this channel', 400);
    }

    // Add member to channel
    const newMember = await channelMemberRepo.create({
      channel_id: channelId,
      user_id: userId,
      role: role
    });

    return newMember;
  }

  // Remove member from channel
  static async removeMember(channelId: string, userIdToRemove: string, currentUserId: string) {
    // Get channel to check organization
    const channel = await channelRepo.getById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    // Check if current user is org owner/admin or channel manager, or removing themselves
    const orgMembership = await orgMemberRepo.findOne({
      organization_id: channel.org_id,
      user_id: currentUserId
    });

    const channelMembership = await channelMemberRepo.findOne({
      channel_id: channelId,
      user_id: currentUserId
    });

    const canRemove = 
      orgMembership?.role === 'OWNER' ||
      orgMembership?.role === 'ADMIN' ||
      (channelMembership?.role === 'MANAGER' && userIdToRemove === currentUserId);

    // Additional check: prevent managers from removing owners/admins/other managers
    if (channelMembership?.role === 'MANAGER' && userIdToRemove !== currentUserId) {
      const targetUserOrgMembership = await orgMemberRepo.findOne({
        organization_id: channel.org_id,
        user_id: userIdToRemove
      });

      const targetUserChannelMembership = await channelMemberRepo.findOne({
        channel_id: channelId,
        user_id: userIdToRemove
      });

      if (targetUserOrgMembership?.role === 'OWNER' || 
          targetUserOrgMembership?.role === 'ADMIN' ||
          targetUserChannelMembership?.role === 'MANAGER') {
        throw new AppError('Channel managers cannot remove organization owners, admins, or other managers', 403);
      }
    }

    if (!canRemove) {
      throw new AppError('You do not have permission to remove this member', 403);
    }

    // Remove member
    await channelMemberRepo.delete(userIdToRemove);

    return { success: true };
  }

  // Update member role
  static async updateMemberRole(channelId: string, userId: string, newRole: 'MANAGER' | 'MEMBER', currentUserId: string) {
    // Get channel to check organization
    const channel = await channelRepo.getById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    // Check if current user is org owner/admin or channel manager
    const orgMembership = await orgMemberRepo.findOne({
      organization_id: channel.org_id,
      user_id: currentUserId
    });

    const channelMembership = await channelMemberRepo.findOne({
      channel_id: channelId,
      user_id: currentUserId
    });

    const canUpdateRole = 
      orgMembership?.role === 'OWNER' ||
      orgMembership?.role === 'ADMIN';

    if (!canUpdateRole) {
      throw new AppError('Only organization owners, admins, or channel managers can change member roles', 403);
    }

    // Update member role
    const memberToUpdate = await channelMemberRepo.findOne({
      channel_id: channelId,
      user_id: userId
    });

    if (!memberToUpdate) {
      throw new AppError('Member not found', 404);
    }

    await channelMemberRepo.update(memberToUpdate.id, { role: newRole });

    return { success: true };
  }

  // Update channel
  static async updateChannel(channelId: string, updateData: { name?: string }, currentUserId: string) {
    // Get channel to check organization
    const channel = await channelRepo.getById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    // Check if user is organization owner or admin
    const orgMembership = await orgMemberRepo.findOne({
      organization_id: channel.org_id,
      user_id: currentUserId
    });

    const canUpdate = 
      orgMembership?.role === 'OWNER' ||
      orgMembership?.role === 'ADMIN';

    if (!canUpdate) {
      throw new AppError('Only organization owners and admins can update channels', 403);
    }

    // If updating name, check if it already exists in this organization
    if (updateData.name) {
      const existingChannel = await channelRepo.findOne({ 
        name: updateData.name,
        org_id: channel.org_id 
      });
      
      if (existingChannel && existingChannel.id !== channelId) {
        throw new AppError('Channel name already exists in this organization', 400, { name: 'UNIQUE' });
      }
    }

    const updatedChannel = await channelRepo.update(channelId, {
      ...updateData,
      updated_at: new Date()
    });

    return updatedChannel;
  }

  // Delete channel
  static async deleteChannel(channelId: string, currentUserId: string) {
    // Get channel to check organization
    const channel = await channelRepo.getById(channelId);
    if (!channel) {
      throw new AppError('Channel not found', 404);
    }

    // Check if user is organization owner or admin
    const orgMembership = await orgMemberRepo.findOne({
      organization_id: channel.org_id,
      user_id: currentUserId
    });

    const canDelete = 
      orgMembership?.role === 'OWNER' ||
      orgMembership?.role === 'ADMIN';

    if (!canDelete) {
      throw new AppError('Only organization owners and admins can delete channels', 403);
    }

    // Use transaction to delete channel and all related data
    await prisma.$transaction(async (tx) => {
      // Delete channel members
      await channelMemberRepo.delete(
        await channelMemberRepo.getAll({ where: { channel_id: channelId } }).then(members => 
          members.map((member: any) => member.id)
        ),
        tx
      );

      // Delete channel
      await channelRepo.delete(channelId, tx);
    });

    return { success: true };
  }

  // Get user's channels across all organizations
  static async getUserChannels(userId: string) {
    const channels = await channelRepo.getAll({
      where: {
        OR: [
          // Condition 1: User explicitly ChannelMember chhe
          { members: { some: { user_id: userId } } },
          // Condition 2: User e Channel ni Organization ma OWNER ke ADMIN chhe
          {
            organization: {
              members: {
                some: {
                  user_id: userId,
                  role: { in: ['OWNER', 'ADMIN'] }
                }
              }
            }
          }
        ]
      },
      include: {
        organization: true,
        // Sathe sathe e user ni explicitly join thayeli details lavva mate
        members: {
          where: { user_id: userId }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Data ne map kariye
    return channels.map((channel: any) => {
      const explicitMembership = channel.members[0]; // Jo e member hase toh ahiya data aavse

      return {
        id: channel.id,
        name: channel.name,
        // Jo explicitly member nathi, etle ke e ADMIN/OWNER rights thi joi rahyo chhe, toh role 'INHERITED_ADMIN' batavso (Front-end mate easy padse)
        role: explicitMembership ? explicitMembership.role : 'INHERITED_ADMIN',
        organization: {
          id: channel.organization.id,
          name: channel.organization.name
        },
        created_at: channel.created_at,
        joined_at: explicitMembership ? explicitMembership.joined_at : channel.created_at
      };
    });
  }
}
