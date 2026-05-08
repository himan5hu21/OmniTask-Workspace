import { BaseRepository } from './base.repository';

export class BoardListRepository extends BaseRepository {
  constructor() {
    super('boardList', false);
  }
}

export const boardListRepository = new BoardListRepository();
