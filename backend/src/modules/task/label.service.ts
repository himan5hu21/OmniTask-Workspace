import { labelRepository } from '@/repositories/label.repository';
import { taskLabelRepository } from '@/repositories/task-label.repository';

export class LabelService {
  async createLabel(orgId: string, name: string, color: string) {
    return labelRepository.create({
      org_id: orgId,
      name,
      color,
    });
  }

  async getOrgLabels(orgId: string) {
    return labelRepository.getAll({
      where: { org_id: orgId }
    });
  }

  async assignLabel(taskId: string, labelId: string) {
    return taskLabelRepository.create({
      task_id: taskId,
      label_id: labelId,
    }, {
      include: { label: true }
    });
  }

  async unassignLabel(taskId: string, labelId: string) {
    return taskLabelRepository.deleteMany({
      where: {
        task_id: taskId,
        label_id: labelId,
      }
    });
  }

  async deleteLabel(labelId: string) {
    return labelRepository.delete(labelId);
  }
}

export const labelService = new LabelService();
