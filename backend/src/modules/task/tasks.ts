import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { HttpStatus } from '@/types/api';
import { createSchema } from '@/utils/swagger';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { sendSuccess } from '@/utils/response';



const taskRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Validation schemas

  const createTaskSchema = z.object({
    title: z.string().min(1),
    channel_id: z.cuid(),
  });

  const createSubTaskSchema = z.object({
    task_id: z.cuid(),
    parent_id: z.cuid().optional(),
    text: z.string().min(1),
  });

  const assignSubTaskSchema = z.object({
    subtask_id: z.cuid(),
    assignee_id: z.cuid(),
    permission_type: z.enum(['VIEW_ONLY', 'CHECK_ONLY', 'EDIT_ALLOWED']),
  });

  // Create a new task (header)
  app.post('/tasks', createSchema({
    description: 'Create a new task in a channel',
    tags: ['Tasks'],
    body: createTaskSchema,
    response: {
      201: z.object({
        message: z.string(),
      }),
    },
  }), async (request, reply) => {

    try {
      const { title, channel_id } = request.body;

      // TODO: Add Prisma task creation

      // const task = await prisma.task.create({
      //   data: {
      //     title,
      //     channel_id,
      //     creator_id: request.user.userId, // From JWT middleware
      //   },
      //   include: { subtasks: true }
      // });

      return sendSuccess(reply, { message: 'Task created successfully' }, 'CREATE');
    } catch (error) {
      fastify.log.error(error);
      return reply.status(HttpStatus.BAD_REQUEST).send({ error: 'Failed to create task' });
    }
  });


  // Create a subtask (nested checkbox)
  app.post('/subtasks', createSchema({
    description: 'Create a new subtask',
    tags: ['Tasks'],
    body: createSubTaskSchema,
    response: {
      201: z.object({ message: z.string() }),
    }
  }), async (request, reply) => {
    try {
      const { task_id, parent_id, text } = request.body;

      // TODO: Add Prisma subtask creation
      // const subtask = await prisma.subTask.create({
      //   data: {
      //     task_id,
      //     parent_id,
      //     text,
      //   },
      // });

      return sendSuccess(reply, { message: 'Subtask created successfully' }, 'CREATE');
    } catch (error) {

      fastify.log.error(error);
      return reply.status(HttpStatus.BAD_REQUEST).send({ error: 'Failed to create subtask' });
    }
  });

  // Assign subtask to user with permissions
  app.post('/subtasks/assign', createSchema({
    description: 'Assign a subtask to a user',
    tags: ['Tasks'],
    body: assignSubTaskSchema,
    response: {
      201: z.object({ message: z.string() }),
    }
  }), async (request, reply) => {
    try {
      const { subtask_id, assignee_id, permission_type } = request.body;

      // TODO: Add Prisma task assignment
      // const assignment = await prisma.taskAssignment.create({
      //   data: {
      //     subtask_id,
      //     assignee_id,
      //     permission_type,
      //   },
      // });

      return sendSuccess(reply, { message: 'Subtask assigned successfully' }, 'CREATE');
    } catch (error) {

      fastify.log.error(error);
      return reply.status(HttpStatus.BAD_REQUEST).send({ error: 'Failed to assign subtask' });
    }
  });

  // Toggle subtask completion
  app.patch('/subtasks/:id/toggle', createSchema({
    description: 'Toggle subtask completion status',
    tags: ['Tasks'],
    params: z.object({ id: z.cuid() }),
    response: {
      200: z.object({ message: z.string() }),
    }
  }), async (request, reply) => {
    try {
      const { id } = request.params;


      // TODO: Add Prisma subtask toggle
      // const subtask = await prisma.subTask.update({
      //   where: { id },
      //   data: { is_completed: !subtask.is_completed },
      // });

      return sendSuccess(reply, { message: 'Subtask toggled successfully' });
    } catch (error) {

      fastify.log.error(error);
      return reply.status(HttpStatus.BAD_REQUEST).send({ error: 'Failed to toggle subtask' });
    }
  });

  // Get tasks for a channel
  app.get('/channels/:channelId/tasks', createSchema({
    description: 'Get all tasks for a specific channel',
    tags: ['Tasks'],
    params: z.object({ channelId: z.string() }),
    response: {
      200: z.object({ message: z.string() }),
    }
  }), async (request, reply) => {
    try {
      const { channelId } = request.params;


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

      return sendSuccess(reply, { message: 'Tasks retrieved successfully' });
    } catch (error) {

      fastify.log.error(error);
      return reply.status(HttpStatus.BAD_REQUEST).send({ error: 'Failed to retrieve tasks' });
    }
  });
};

export default taskRoutes;
