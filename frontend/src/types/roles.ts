// Standardized roles for Organizations and Channels
// These match the Prisma schema in backend/prisma/schema/base.prisma

export const ORG_ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
  GUEST: "GUEST",
} as const;

export type OrgRole = keyof typeof ORG_ROLES;

export const CHANNEL_ROLES = {
  MANAGER: "MANAGER",
  CONTRIBUTOR: "CONTRIBUTOR",
  VIEWER: "VIEWER",
} as const;

export type ChannelRole = keyof typeof CHANNEL_ROLES;
