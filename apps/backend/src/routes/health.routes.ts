import { FastifyPluginAsync } from 'fastify';
import { AppError } from '@/utils/AppError';
import { sendSuccess } from '@/utils/response';
import { HttpStatus } from '@/types/api';
import { prisma } from '@/lib/database';
import { createSchema } from '@/utils/swagger';
import { ZodTypeProvider } from 'fastify-type-provider-zod';


const healthRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Basic health check

  app.get('/health', { 
    ...createSchema({
      description: 'Check API health status',
      tags: ['Health'],
    }),
    config: { isPublic: true } 
  }, async (request, reply) => {

    return sendSuccess(reply, {
      uptime: process.uptime(),
      service: 'omnitask-backend',
      version: '1.0.0'
    }, 'FETCH', 'Health check passed');
  });

  // Detailed health check with database
  app.get('/health/detailed', { 
    ...createSchema({
      description: 'Check detailed API and DB health status',
      tags: ['Health'],
    }),
    config: { isPublic: true } 
  }, async (request, reply) => {

    try {
      // Database health check
      const dbStartTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbResponseTime = Date.now() - dbStartTime;

      return sendSuccess(reply, {
        uptime: process.uptime(),
        service: 'omnitask-backend',
        version: '1.0.0',
        checks: {
          database: {
            status: 'ok',
            responseTime: `${dbResponseTime}ms`
          },
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB'
          }
        }
      }, 'FETCH', 'Detailed health check passed');
    } catch (error) {
      fastify.log.error({ error, message: 'Health check failed' });
      throw new AppError('Service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  });

  // Socket.io health check
  app.get('/health/socket', { 
    ...createSchema({
      description: 'Check Socket.io health status',
      tags: ['Health'],
    }),
    config: { isPublic: true } 
  }, async (request, reply) => {

    try {
      // Get socket.io server instance directly from fastify
      const io = request.server.io;
      
      // Get connected clients count using socket.io v4 API
      const socketCount = io?.engine?.clientsCount || 0;
      
      return sendSuccess(reply, {
        socket: {
          connected: socketCount,
          status: 'running',
          server: 'Socket.io server is accessible'
        }
      }, 'FETCH', 'Socket health check passed');
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : 'Unknown socket error', HttpStatus.SERVICE_UNAVAILABLE);
    }
  });
};

export default healthRoutes;
