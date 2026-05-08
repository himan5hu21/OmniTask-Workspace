import { BaseRepository } from './base.repository';

export class ChecklistItemRepository extends BaseRepository {
  constructor() {
    super('taskChecklistItem', false);
  }
}

export const checklistItemRepository = new ChecklistItemRepository();
