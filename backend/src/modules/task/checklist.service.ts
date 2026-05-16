import { checklistRepository } from '@/repositories/checklist.repository';
import { checklistItemRepository } from '@/repositories/checklist-item.repository';

export class ChecklistService {
  async createChecklist(taskId: string, title: string) {
    // Get last checklist to calculate next position
    const lastChecklist = await checklistRepository.findOne(
      { task_id: taskId },
      { orderBy: { position: 'desc' } }
    );
    const position = lastChecklist ? lastChecklist.position + 1000 : 1000;

    return checklistRepository.create({
      task_id: taskId,
      name: title,
      position,
    }, {
      include: { items: true }
    });
  }

  async updateChecklist(checklistId: string, title: string, assignee_id?: string | null) {
    const data: any = { name: title };
    if (assignee_id !== undefined) data.assignee_id = assignee_id;
    return checklistRepository.update(checklistId, data);
  }

  async addItem(checklistId: string, creatorId: string, content: string, position?: number) {
    if (position === undefined || position === 0) {
      const lastItem = await checklistItemRepository.findOne(
        { checklist_id: checklistId },
        { orderBy: { position: 'desc' } }
      );
      position = lastItem ? lastItem.position + 1000 : 1000;
    }

    return checklistItemRepository.create({
      text: content,
      position,
      checklist_id: checklistId,
    });
  }

  async updateItem(itemId: string, data: { text?: string; is_completed?: boolean; position?: number; assignee_id?: string | null }) {
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
