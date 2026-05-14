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

  async updateChecklist(checklistId: string, title: string) {
    return checklistRepository.update(checklistId, { name: title });
  }

  async addItem(checklistId: string, creatorId: string, content: string, position: number = 0) {
    return checklistItemRepository.create({
      text: content,
      position,
      checklist_id: checklistId,
    });
  }

  async updateItem(itemId: string, data: { text?: string; is_completed?: boolean; position?: number }) {
    return checklistItemRepository.update(itemId, data);
  }

  async deleteChecklist(checklistId: string) {
    return checklistRepository.delete(checklistId);
  }

  async deleteItem(itemId: string) {
    return checklistItemRepository.hardDelete(itemId);
  }
}

export const checklistService = new ChecklistService();
