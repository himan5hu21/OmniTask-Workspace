import { BaseRepository } from './base.repository';

export class CommentRepository extends BaseRepository {
  constructor() {
    super('taskComment', false); // No soft delete in schema
  }
}

export const commentRepository = new CommentRepository();
