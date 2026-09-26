import { labelRepository } from '@/repositories/label.repository';
import { taskLabelRepository } from '@/repositories/task-label.repository';
import { activityService } from './activity.service';

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

  async assignLabel(taskId: string, labelId: string, actorId?: string, labelName?: string) {
    const result = await taskLabelRepository.create({
      task_id: taskId,
      label_id: labelId,
    }, {
      include: { label: true }
    });

    if (actorId) {
      activityService.logActivity(
        taskId,
        actorId,
        'LABEL_ADDED',
        labelName ? `Added label "${labelName}"` : undefined
      ).catch((e) => console.error("[Activity]", e?.message ?? e));
    }

    return result;
  }

  async unassignLabel(taskId: string, labelId: string, actorId?: string, labelName?: string) {
    const result = await taskLabelRepository.deleteMany({
      where: {
        task_id: taskId,
        label_id: labelId,
      }
    });

    if (actorId) {
      activityService.logActivity(
        taskId,
        actorId,
        'LABEL_REMOVED',
        labelName ? `Removed label "${labelName}"` : undefined
      ).catch((e) => console.error("[Activity]", e?.message ?? e));
    }

    return result;
  }

  async deleteLabel(labelId: string) {
    return labelRepository.delete(labelId);
  }
}

export const labelService = new LabelService();

