/**
 * ROLE-BASED CAPABILITY MATRICES
 * This is the single source of truth for all permissions in OmniTask.
 * 
 * TIER 1: Organization-level capabilities
 * TIER 2: Channel-level capabilities
 */

export const ORG_PERMISSIONS = {
  OWNER: [
    'org.read', 'org.update', 'org.delete', 'org.transfer_ownership', 
    'member.invite', 'member.remove', 'member.role.change', 
    'channel.create', 'channel.delete', 'channel.update', 'channel.view', 'channel.manage',
    'label.manage', 'settings.manage'
  ],
  ADMIN: [
    'org.read', 'org.update', 'member.invite', 'member.remove', 
    'channel.create', 'channel.delete', 'channel.update', 'channel.view', 'channel.manage',
    'label.manage', 'settings.manage', 'org.leave'
  ],
  MEMBER: ['org.read', 'channel.view', 'org.leave'],
  GUEST: ['org.read', 'channel.view', 'org.leave']
} as const;

export const CHANNEL_PERMISSIONS = {
  MANAGER: [
    'message.read', 'message.send', 'message.delete.own', 'message.delete.any', 
    'task.view', 'task.create', 'channel.update', 'channel.member.add', 
    'channel.member.remove', 'channel.member.promote', 'board.list.create', 
    'board.list.delete', 'board.list.reorder'
  ],
  CONTRIBUTOR: [
    'message.read', 'message.send', 'message.delete.own', 'task.view', 'task.create'
  ],
  VIEWER: ['message.read', 'task.view']
} as const;

export type OrgRole = keyof typeof ORG_PERMISSIONS;
export type ChannelRole = keyof typeof CHANNEL_PERMISSIONS;
