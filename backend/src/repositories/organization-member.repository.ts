import { BaseRepository } from './base.repository';

export class OrganizationMemberRepository extends BaseRepository {
  constructor() {
    super('organizationMember', false);
  }

  async getMember(orgId: string, userId: string) {
    const { prisma } = await import('@/lib/database');
    return prisma.organizationMember.findUnique({
      where: { organization_id_user_id: { organization_id: orgId, user_id: userId } },
      select: { role: true, role_updated_at: true }
    });
  }
}

export const organizationMemberRepository = new OrganizationMemberRepository();
