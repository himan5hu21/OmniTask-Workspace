import { BaseRepository } from './base.repository';

export class ChannelRepository extends BaseRepository {
  constructor() {
    super('channel', true); // Soft delete exists in base.prisma
  }
}

export const channelRepository = new ChannelRepository();
