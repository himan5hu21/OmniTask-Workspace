import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { createContext } from 'react';
import { createContextualCan } from '@casl/react';
import { ORG_PERMISSIONS, CHANNEL_PERMISSIONS, OrgRole, ChannelRole } from './permission-matrices';

export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'invite' | 'remove' | 'promote' | 'leave' | 'view';
export type Subjects = 'Organization' | 'Channel' | 'Member' | 'Task' | 'Message' | 'Settings' | 'Label' | 'Board' | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

const SUBJECT_MAP: Record<string, Subjects> = {
  org: 'Organization',
  member: 'Member',
  channel: 'Channel',
  label: 'Label',
  settings: 'Settings',
  message: 'Message',
  task: 'Task',
  board: 'Board'
};

export function defineAbilityFor(orgRole?: string | null, channelRole?: string | null): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // 1. Handle Tier 1 (Organization)
  if (orgRole === 'OWNER') {
    can('manage', 'all');
  } else if (orgRole && ORG_PERMISSIONS[orgRole as OrgRole]) {
    ORG_PERMISSIONS[orgRole as OrgRole].forEach(capability => {
      const parts = capability.split('.');
      const action = parts[parts.length - 1] as Actions;
      const subjectKey = parts[0];
      const subject = SUBJECT_MAP[subjectKey] || 'all';
      can(action, subject);
    });

    // Special case: Admin also gets Tier 2 bypass
    if (orgRole === 'ADMIN') {
      can('manage', 'Message');
      can('manage', 'Task');
    }
  }

  // 2. Handle Tier 2 (Channel) - Only if not Owner/Admin bypass
  if (orgRole !== 'OWNER' && orgRole !== 'ADMIN' && channelRole && CHANNEL_PERMISSIONS[channelRole as ChannelRole]) {
    CHANNEL_PERMISSIONS[channelRole as ChannelRole].forEach(capability => {
      const parts = capability.split('.');
      const action = parts[parts.length - 1] as Actions;
      const subjectKey = parts[0];
      const subject = SUBJECT_MAP[subjectKey] || 'all';
      can(action, subject);
    });
  }

  return build();
}

export const AbilityContext = createContext<AppAbility>(createMongoAbility());
export const Can = createContextualCan(AbilityContext.Consumer);
