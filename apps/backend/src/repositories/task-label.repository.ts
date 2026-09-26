import { BaseRepository } from './base.repository';

export class TaskLabelRepository extends BaseRepository {
  constructor() {
    super('taskLabel', false);
  }
}

export const taskLabelRepository = new TaskLabelRepository();
