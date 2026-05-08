import { boardListRepository } from '@/repositories/board-list.repository';

export class BoardListService {
  async createList(data: { channel_id: string; name: string; position: number }) {
    return boardListRepository.create(data);
  }

  async getListsByChannel(channelId: string) {
    return boardListRepository.getAll({
      where: { channel_id: channelId },
      orderBy: { position: 'asc' },
    });
  }

  async reorderLists(items: { id: string; position: number }[]) {
    const { prisma } = await import('@/lib/database');
    
    return prisma.$transaction(
      items.map((item) =>
        prisma.boardList.update({
          where: { id: item.id },
          data: { position: item.position },
        })
      )
    );
  }
}

export const boardListService = new BoardListService();
