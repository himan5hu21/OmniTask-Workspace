import { BaseRepository } from './base.repository';

export class ActivityRepository extends BaseRepository {
  constructor() {
    super('taskActivity', false); // No soft delete in schema
  }
}

export const activityRepository = new ActivityRepository();
