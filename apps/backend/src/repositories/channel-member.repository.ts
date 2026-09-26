import { BaseRepository } from './base.repository';

export class ChannelMemberRepository extends BaseRepository {
  constructor() {
    super('channelMember', false);
  }

  async getMember(channelId: string, userId: string) {
    const { prisma } = await import('@/lib/database');
    return prisma.channelMember.findUnique({
      where: { user_id_channel_id: { user_id: userId, channel_id: channelId } },
      select: { role: true }
    });
  }
}

export const channelMemberRepository = new ChannelMemberRepository();
