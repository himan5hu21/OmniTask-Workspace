import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const taskRoutes: FastifyPluginAsync = async (fastify) => {
  // Validation schemas
  const createTaskSchema = z.object({
    title: z.string().min(1),
    channel_id: z.string().cuid(),
  });

  const createSubTaskSchema = z.object({
    task_id: z.string().cuid(),
    parent_id: z.string().cuid().optional(),
    text: z.string().min(1),
  });

  const assignSubTaskSchema = z.object({
    subtask_id: z.string().cuid(),
    assignee_id: z.string().cuid(),
    permission_type: z.enum(['VIEW_ONLY', 'CHECK_ONLY', 'EDIT_ALLOWED']),
  });

  // Create a new task (header)
  fastify.post('/tasks', async (request, reply) => {
    try {
      const { title, channel_id } = createTaskSchema.parse(request.body);

      // TODO: Add Prisma task creation
      // const task = await prisma.task.create({
      //   data: {
      //     title,
      //     channel_id,
      //     creator_id: request.user.userId, // From JWT middleware
      //   },
      //   include: { subtasks: true }
      // });

      return reply.status(201).send({
        message: 'Task created successfully',
        // task
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: 'Failed to create task' });
    }
  });

  // Create a subtask (nested checkbox)
  fastify.post('/subtasks', async (request, reply) => {
    try {
      const { task_id, parent_id, text } = createSubTaskSchema.parse(request.body);

      // TODO: Add Prisma subtask creation
      // const subtask = await prisma.subTask.create({
      //   data: {
      //     task_id,
      //     parent_id,
      //     text,
      //   },
      // });

      return reply.status(201).send({
        message: 'Subtask created successfully',
        // subtask
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: 'Failed to create subtask' });
    }
  });

  // Assign subtask to user with permissions
  fastify.post('/subtasks/assign', async (request, reply) => {
    try {
      const { subtask_id, assignee_id, permission_type } = assignSubTaskSchema.parse(request.body);

      // TODO: Add Prisma task assignment
      // const assignment = await prisma.taskAssignment.create({
      //   data: {
      //     subtask_id,
      //     assignee_id,
      //     permission_type,
      //   },
      // });

      return reply.status(201).send({
        message: 'Subtask assigned successfully',
        // assignment
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: 'Failed to assign subtask' });
    }
  });

  // Toggle subtask completion
  fastify.patch('/subtasks/:id/toggle', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // TODO: Add Prisma subtask toggle
      // const subtask = await prisma.subTask.update({
      //   where: { id },
      //   data: { is_completed: !subtask.is_completed },
      // });

      return reply.send({
        message: 'Subtask toggled successfully',
        // subtask
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: 'Failed to toggle subtask' });
    }
  });

  // Get tasks for a channel
  fastify.get('/channels/:channelId/tasks', async (request, reply) => {
    try {
      const { channelId } = request.params as { channelId: string };

      // TODO: Add Prisma task retrieval
      // const tasks = await prisma.task.findMany({
      //   where: { channel_id: channelId },
      //   include: {
      //     subtasks: {
      //       include: {
      //         assignments: {
      //           include: { assignee: true }
      //         }
      //       }
      //     }
      //   }
      // });

      return reply.send({
        message: 'Tasks retrieved successfully',
        // tasks
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(400).send({ error: 'Failed to retrieve tasks' });
    }
  });
};

export default taskRoutes;
