import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { taskController } from './task.controller';
import { createSchema } from '@/utils/swagger';

const taskRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // PHASE 1 — Board Foundation

  // 1. Create Board List
  app.post(
    '/board-lists',
    createSchema({
      description: 'Create a new board list (column)',
      tags: ['Tasks'],
      body: z.object({
        channel_id: z.string().cuid(),
        name: z.string().min(1),
        position: z.number().int().max(2147483647),
      }),
    }),
    taskController.createBoardList
  );

  // 2. Get Full Board
  app.get(
    '/boards/:channelId',
    createSchema({
      description: 'Get full board data (lists with nested tasks)',
      tags: ['Tasks'],
      params: z.object({
        channelId: z.cuid(),
      }),
    }),
    taskController.getBoard
  );

  // 3. Create Task
  app.post(
    '/tasks',
    createSchema({
      description: 'Create a new task card',
      tags: ['Tasks'],
      body: z.object({
        title: z.string().min(1),
        list_id: z.cuid(),
        channel_id: z.cuid(),
        org_id: z.cuid(),
      }),
    }),
    taskController.createTask
  );

  // PHASE 2 — Drag & Drop Core

  // 4. Move Task
  app.patch(
    '/tasks/:id/move',
    createSchema({
      description: 'Move task between lists or change its position',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
      body: z.object({
        target_list_id: z.string().cuid(),
        position: z.number().int().max(2147483647),
      }),
    }),
    taskController.moveTask
  );

  // 5. Reorder Lists
  app.patch(
    '/board-lists/reorder',
    createSchema({
      description: 'Reorder board lists (columns) in bulk',
      tags: ['Tasks'],
      body: z.object({
        channel_id: z.string().cuid(),
        items: z.array(
          z.object({
            id: z.string().cuid(),
            position: z.number().int().max(2147483647),
          })
        ),
      }),
    }),
    taskController.reorderLists
  );
  
  app.patch(
    '/board-lists/:id',
    createSchema({
      description: 'Update a board list (column) name or position',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
      body: z.object({
        name: z.string().min(1).optional(),
        position: z.number().int().max(2147483647).optional(),
      }),
    }),
    taskController.updateBoardList
  );

  app.delete(
    '/board-lists/:id',
    createSchema({
      description: 'Delete a board list (column) and all its tasks',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
    }),
    taskController.deleteBoardList
  );

  // PHASE 3 — Task Modal

  // 6. Get Single Task Details
  app.get(
    '/tasks/:id',
    createSchema({
      description: 'Get full details of a single task',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
    }),
    taskController.getTask
  );

  // 7. Update Task API
  app.patch(
    '/tasks/:id',
    createSchema({
      description: 'Update core properties of a task',
      tags: ['Tasks'],
      params: z.object({ id: z.cuid() }),
      body: z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).nullable().optional(),
        start_date: z.date().nullable().optional(),
        due_date: z.date().nullable().optional(),
        completed_at: z.date().nullable().optional(),
        cover_color: z.string().optional(),
      }),
    }),
    taskController.updateTask
  );
  
  app.delete(
    '/tasks/:id',
    createSchema({
      description: 'Delete a task card',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
    }),
    taskController.deleteTask
  );

  // PHASE 4 — Collaboration Features

  // 8. Assignments
  app.post(
    '/tasks/:id/assignments',
    createSchema({
      description: 'Assign a user to a task',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
      body: z.object({ user_id: z.string().cuid() }),
    }),
    taskController.assignUser
  );

  app.delete(
    '/tasks/:id/assignments/:userId',
    createSchema({
      description: 'Remove a user assignment from a task',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid(), userId: z.string().cuid() }),
    }),
    taskController.unassignUser
  );

  // 9. Comments
  app.post(
    '/tasks/:id/comments',
    createSchema({
      description: 'Post a comment on a task',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
      body: z.object({ content: z.string().min(1) }),
    }),
    taskController.createComment
  );

  app.get(
    '/tasks/:id/comments',
    createSchema({
      description: 'Get all comments for a task',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
    }),
    taskController.getComments
  );

  // 10. Checklists
  app.post(
    '/tasks/:id/checklists',
    createSchema({
      description: 'Create a new checklist for a task',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
      body: z.object({ title: z.string().min(1) }),
    }),
    taskController.createChecklist
  );

  app.patch(
    '/checklists/:id',
    createSchema({
      description: 'Update checklist name',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
      body: z.object({ title: z.string().min(1) }),
    }),
    taskController.updateChecklist
  );

  app.post(
    '/checklists/:id/items',
    createSchema({
      description: 'Add an item to a checklist',
      tags: ['Tasks'],
      params: z.object({ id: z.cuid() }),
      body: z.object({ text: z.string().min(1), position: z.number().int().max(2147483647).optional() }),
    }),
    taskController.addChecklistItem
  );

  app.patch(
    '/checklist-items/:id',
    createSchema({
      description: 'Update a checklist item (content, completion, position)',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
      body: z.object({
        text: z.string().optional(),
        is_completed: z.boolean().optional(),
        position: z.number().int().max(2147483647).optional(),
      }),
    }),
    taskController.updateChecklistItem
  );

  app.delete(
    '/checklist-items/:id',
    createSchema({
      description: 'Delete a checklist item',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
    }),
    taskController.deleteChecklistItem
  );

  app.delete(
    '/checklists/:id',
    createSchema({
      description: 'Delete a checklist',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
    }),
    taskController.deleteChecklist
  );

  // 12. Labels
  app.post(
    '/labels',
    createSchema({
      description: 'Create a new global organization label',
      tags: ['Tasks'],
      body: z.object({ org_id: z.string().cuid(), name: z.string().min(1), color: z.string() }),
    }),
    taskController.createLabel
  );

  app.post(
    '/tasks/:id/labels',
    createSchema({
      description: 'Assign a label to a task',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
      body: z.object({ label_id: z.string().cuid() }),
    }),
    taskController.assignLabel
  );

  // 11. Attachments
  app.post(
    '/tasks/:id/attachments',
    createSchema({
      description: 'Add an attachment to a task',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
      body: z.object({
        name: z.string().min(1),
        url: z.string().url(),
        file_type: z.string(),
        file_size: z.number().int(),
      }),
    }),
    taskController.addAttachment
  );

  app.delete(
    '/attachments/:id',
    createSchema({
      description: 'Remove an attachment from a task',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
    }),
    taskController.deleteAttachment
  );

  // PHASE 5 — Nested Tasks
  app.post(
    '/tasks/:id/subtasks',
    createSchema({
      description: 'Create a subtask for a parent task',
      tags: ['Tasks'],
      params: z.object({ id: z.string().cuid() }),
      body: z.object({ title: z.string().min(1) }),
    }),
    taskController.createSubtask
  );
};

export default taskRoutes;
