import { BaseRepository } from './base.repository';

export class TaskRepository extends BaseRepository {
  constructor() {
    super('task', true); // Supports soft delete
  }
}

export const taskRepository = new TaskRepository();
