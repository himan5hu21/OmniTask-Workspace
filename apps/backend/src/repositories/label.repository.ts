import { BaseRepository } from './base.repository';

export class LabelRepository extends BaseRepository {
  constructor() {
    super('label', false);
  }
}

export const labelRepository = new LabelRepository();
