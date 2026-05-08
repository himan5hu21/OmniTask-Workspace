import { checklistRepository } from '@/repositories/checklist.repository';
import { checklistItemRepository } from '@/repositories/checklist-item.repository';

export class ChecklistService {
  async createChecklist(taskId: string, title: string) {
    return checklistRepository.create({
      task_id: taskId,
      name: title,
    }, {
      include: { items: true }
    });
  }

  async addItem(checklistId: string, content: string, position: number = 0) {
    return checklistItemRepository.create({
      checklist_id: checklistId,
      title: content,
      position,
    });
  }

  async updateItem(itemId: string, data: { title?: string; is_completed?: boolean; position?: number }) {
    return checklistItemRepository.update(itemId, data);
  }

  async deleteChecklist(checklistId: string) {
    return checklistRepository.delete(checklistId);
  }

  async deleteItem(itemId: string) {
    return checklistItemRepository.delete(itemId);
  }
}

export const checklistService = new ChecklistService();
