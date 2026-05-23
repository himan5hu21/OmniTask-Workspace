// src/services/organization.service.ts
import { BaseRepository } from '@/repositories/base.repository'; 
import { AppError } from '@/utils/AppError';
import { HttpStatus } from '@/types/api';
import { prisma } from '@/lib/database';
import { PermissionGuard } from '@/utils/permissions';
import type { Server } from 'socket.io';
import { sendMail } from '../../services/mail.service';

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

  // 9. Generate Invitation Link
  static async generateInvitation(
    orgId: string,
    email: string,
    role: 'ADMIN' | 'MEMBER' | 'GUEST',
    currentUserId: string,
    jwt: any
  ) {
    const membership = await orgMemberRepo.findOne({ organization_id: orgId, user_id: currentUserId });
    if (!membership) throw new AppError('Access denied', HttpStatus.FORBIDDEN);

    // Capability Check: member.invite
    if (!PermissionGuard.canOrg(membership.role, 'member.invite')) {
      throw new AppError('You do not have permission to invite members', HttpStatus.FORBIDDEN);
    }

    const org = await orgRepo.getById(orgId);
    if (!org) throw new AppError('Organization not found', HttpStatus.NOT_FOUND);

    // Sign a short-lived token with the invite context
    const token = jwt.sign(
      { orgId, email, role, type: 'org_invite' },
      { expiresIn: '7d' }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/invite/accept?token=${token}`;

    // Premium responsive HTML email template with light/dark theme support & Tailwind CSS fallbacks
    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You are invited to join ${org.name} on OmniTask</title>
  
  <!-- Tailwind CSS v4 Play CDN -->
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  
  <style type="text/tailwindcss">
    @theme {
      --color-brand-primary: #6366f1;
      --color-brand-secondary: #8b5cf6;
      --color-brand-dark: #0b0f19;
    }
  </style>

  <!-- Complete Standard CSS Fallbacks for restricted email clients (like Gmail) with no JS support -->
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f3f4f6;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%);
      padding: 35px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .content {
      padding: 40px 35px;
    }
    .welcome-text {
      font-size: 16px;
      line-height: 1.6;
      color: #4b5563;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .invite-card {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
    }
    .info-row {
      margin-bottom: 12px;
      font-size: 15px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .label {
      color: #6b7280;
      font-weight: 500;
      display: inline-block;
      width: 120px;
    }
    .value {
      color: #111827;
      font-weight: 600;
    }
    .cta-container {
      text-align: center;
      margin: 35px 0 20px;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      border-radius: 8px;
      box-shadow: 0 8px 16px -3px rgba(99, 102, 241, 0.3);
      transition: all 0.2s ease;
    }
    .btn:hover {
      box-shadow: 0 10px 20px -3px rgba(99, 102, 241, 0.5);
    }
    .expiry {
      font-size: 13px;
      color: #6b7280;
      text-align: center;
      margin-top: 15px;
    }
    .footer {
      padding: 30px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
      font-size: 12px;
      color: #9ca3af;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }

    /* Complete Dark Mode Fallbacks for mail clients with prefers-color-scheme */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0b0f19 !important;
        color: #f3f4f6 !important;
      }
      .wrapper {
        background-color: #0b0f19 !important;
      }
      .container {
        background: linear-gradient(135deg, #111827 0%, #1f2937 100%) !important;
        border-color: rgba(99, 102, 241, 0.2) !important;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3) !important;
      }
      .welcome-text {
        color: #d1d5db !important;
      }
      .invite-card {
        background-color: rgba(255, 255, 255, 0.03) !important;
        border-color: rgba(255, 255, 255, 0.05) !important;
      }
      .label {
        color: #9ca3af !important;
      }
      .value {
        color: #ffffff !important;
      }
      .expiry {
        color: #9ca3af !important;
      }
      .footer {
        border-top-color: rgba(255, 255, 255, 0.05) !important;
        color: #6b7280 !important;
      }
    }
  </style>
</head>
<body class="bg-gray-100 text-gray-800 font-sans antialiased dark:bg-brand-dark dark:text-slate-100">
  <div class="wrapper py-10 bg-gray-100 dark:bg-brand-dark">
    <div class="container mx-auto max-w-[600px] bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden dark:bg-linear-to-br dark:from-slate-900 dark:to-slate-800 dark:border-indigo-950/40 dark:shadow-indigo-950/20">
      <div class="header bg-linear-to-r from-indigo-600 to-violet-600 py-9 px-8 text-center">
        <h1 class="text-white text-3xl font-extrabold tracking-tight m-0">OmniTask</h1>
      </div>
      <div class="content py-10 px-9">
        <p class="welcome-text text-base leading-relaxed text-gray-600 m-0 mb-6 dark:text-gray-300">
          Hello! You have been invited to join the <strong class="text-gray-900 dark:text-white font-bold">${org.name}</strong> organization on OmniTask, a premium workspace designed for seamless team collaboration and task tracking.
        </p>
        
        <div class="invite-card bg-gray-50 border border-gray-200 rounded-xl p-6 mb-7 dark:bg-white/5 dark:border-white/5">
          <div class="info-row mb-3 text-sm">
            <span class="label text-gray-500 font-medium inline-block w-[120px] dark:text-gray-400">Organization:</span>
            <span class="value text-gray-900 font-semibold dark:text-white">${org.name}</span>
          </div>
          <div class="info-row mb-3 text-sm">
            <span class="label text-gray-500 font-medium inline-block w-[120px] dark:text-gray-400">Your Role:</span>
            <span class="value text-violet-500 font-semibold dark:text-violet-400">${role}</span>
          </div>
          <div class="info-row text-sm">
            <span class="label text-gray-500 font-medium inline-block w-[120px] dark:text-gray-400">Invited Email:</span>
            <span class="value text-gray-900 font-semibold dark:text-white">${email}</span>
          </div>
        </div>

        <p class="welcome-text text-sm leading-relaxed text-gray-600 m-0 mb-6 dark:text-gray-300">
          Click the link below to accept the invitation and set up your workspace:
        </p>

        <div class="cta-container text-center my-9">
          <a href="${inviteLink}" class="btn inline-block bg-linear-to-r from-indigo-500 to-violet-500 text-white font-semibold text-sm py-3.5 px-8 rounded-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.01] transition-all duration-200">Accept Invitation</a>
          <p class="expiry text-xs text-gray-500 mt-4 dark:text-gray-400">This link will expire in 7 days.</p>
        </div>
      </div>
      <div class="footer text-center py-7 border-t border-gray-100 dark:border-white/5">
        <p class="text-[11px] text-gray-400 m-0 mb-2 dark:text-gray-500">If you did not expect this invitation, you can safely ignore this email.</p>
        <p class="text-[11px] text-gray-400 m-0 dark:text-gray-500">© 2026 OmniTask. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Asynchronously dispatch the email so it doesn't block the API response
    // if there are any network/API issues with email delivery.
    sendMail(email, `You've been invited to join ${org.name} on OmniTask`, emailHtml)
      .catch((err: any) => {
        console.error('❌ [OrganizationService] Failed to send invitation email:', err.message);
      });

    return { inviteLink, token, orgName: org.name, email, role };
  }

  // 10. Accept Invitation
  static async acceptInvitation(token: string, currentUserId: string, jwt: any, io?: Server) {
    let payload: { orgId: string; email: string; role: 'ADMIN' | 'MEMBER' | 'GUEST'; type: string };

    try {
      payload = jwt.verify(token) as any;
    } catch {
      throw new AppError('Invalid or expired invitation link', HttpStatus.BAD_REQUEST);
    }

    if (payload.type !== 'org_invite') {
      throw new AppError('Invalid invitation token', HttpStatus.BAD_REQUEST);
    }

    const { orgId, email, role } = payload;

    // Verify the current user's email matches the invite email
    const currentUser = await userRepo.getById(currentUserId, { select: { id: true, email: true } });
    if (!currentUser) throw new AppError('User not found', HttpStatus.NOT_FOUND);

    if (currentUser.email.toLowerCase() !== email.toLowerCase()) {
      throw new AppError(
        `This invitation was sent to ${email}. Please log in with that email address to accept.`,
        HttpStatus.FORBIDDEN
      );
    }

    // Check not already a member
    const existingMember = await orgMemberRepo.findOne({ organization_id: orgId, user_id: currentUserId });
    if (existingMember) {
      // Already a member — just return the org details so the frontend can redirect
      const org = await orgRepo.getById(orgId);
      return { orgId, orgName: org?.name, alreadyMember: true };
    }

    // Directly add the member (the JWT is the authority — no further permission check needed)
    await prisma.$transaction(async (tx) => {
      await orgMemberRepo.create({ organization_id: orgId, user_id: currentUserId, role }, {}, tx);
      const defaultChannel = await channelRepo.findOne({ org_id: orgId, isDefault: true }, {}, tx);
      if (defaultChannel) {
        const channelRole = role === 'ADMIN' ? 'MANAGER' : (role === 'GUEST' ? 'VIEWER' : 'CONTRIBUTOR');
        const existingChannelMember = await channelMemberRepo.findOne({ channel_id: defaultChannel.id, user_id: currentUserId }, {}, tx);
        if (!existingChannelMember) {
          await channelMemberRepo.create({ channel_id: defaultChannel.id, user_id: currentUserId, role: channelRole }, {}, tx);
        }
      }
    });

    if (io) io.to(`org:${orgId}`).emit('org:member_added', { user_id: currentUserId, email, role, timestamp: new Date().toISOString() });

    const org = await orgRepo.getById(orgId);
    return { orgId, orgName: org?.name, alreadyMember: false };
  }

  // 12. Get Invitation Status (Public)
  static async getInvitationStatus(token: string, jwt: any) {
    let payload: { orgId: string; email: string; role: 'ADMIN' | 'MEMBER' | 'GUEST'; type: string };

    try {
      payload = jwt.verify(token) as any;
    } catch {
      throw new AppError('Invalid or expired invitation link', HttpStatus.BAD_REQUEST);
    }

    if (payload.type !== 'org_invite') {
      throw new AppError('Invalid invitation token', HttpStatus.BAD_REQUEST);
    }

    const { orgId, email, role } = payload;
    const org = await orgRepo.getById(orgId);
    if (!org) throw new AppError('Organization not found', HttpStatus.NOT_FOUND);

    // Check if the user exists in the database
    const userExists = await userRepo.findOne({ email: email.toLowerCase() });

    return {
      valid: true,
      email,
      orgName: org.name,
      role,
      userExists: !!userExists
    };
  }

  // 11. Hard Delete organization
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
