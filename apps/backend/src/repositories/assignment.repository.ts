import { BaseRepository } from './base.repository';

export class AssignmentRepository extends BaseRepository {
  constructor() {
    super('taskAssignment', false);
  }
}

export const assignmentRepository = new AssignmentRepository();
