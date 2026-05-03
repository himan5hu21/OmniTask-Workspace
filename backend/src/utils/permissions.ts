import { ORG_PERMISSIONS, CHANNEL_PERMISSIONS } from './permission-matrices';

export class PermissionGuard {
  // Tier 1 Checks
  static canOrg(role: string | undefined | null, action: string): boolean {
    if (!role) return false;
    const permissions = (ORG_PERMISSIONS[role as keyof typeof ORG_PERMISSIONS] || []) as readonly string[];
    return permissions.includes(action);
  }

  // Tier 2 Checks (With Tier 1 Bypass)
  static canChannel(orgRole: string | undefined | null, channelRole: string | undefined | null, action: string): boolean {
    // Org OWNER and ADMIN bypass all channel and task level checks automatically
    if (orgRole === 'OWNER' || orgRole === 'ADMIN') return true;
    
    if (!channelRole) return false;
    const permissions = (CHANNEL_PERMISSIONS[channelRole as keyof typeof CHANNEL_PERMISSIONS] || []) as readonly string[];
    return permissions.includes(action);
  }
}
