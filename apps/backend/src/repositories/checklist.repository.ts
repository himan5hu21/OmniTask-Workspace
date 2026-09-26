import { BaseRepository } from './base.repository';

export class ChecklistRepository extends BaseRepository {
  constructor() {
    super('taskChecklist', false);
  }
}

export const checklistRepository = new ChecklistRepository();
