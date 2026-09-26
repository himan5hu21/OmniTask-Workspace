import { BaseRepository } from './base.repository';

export class AttachmentRepository extends BaseRepository {
  constructor() {
    super('taskAttachment', false); // No soft delete in schema
  }
}

export const attachmentRepository = new AttachmentRepository();
