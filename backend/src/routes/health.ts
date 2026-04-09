import { FastifyPluginAsync } from 'fastify';
import { AppError } from '@/utils/AppError';
import { sendSuccess } from '@/utils/response';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Basic health check
  fastify.get('/health', { config: { isPublic: true } }, async (request, reply) => {
    return sendSuccess(reply, {
      uptime: process.uptime(),
      service: 'synkro-backend',
      version: '1.0.0'
    }, 'FETCH', 'Health check passed');
  });

  // Detailed health check with database
  fastify.get('/health/detailed', { config: { isPublic: true } }, async (request, reply) => {
    try {
      // TODO: Add database health check
      // const dbStatus = await checkDatabaseHealth();
      
      return sendSuccess(reply, {
        uptime: process.uptime(),
        service: 'synkro-backend',
        version: '1.0.0',
        checks: {
          database: {
            status: 'ok', // TODO: Make this dynamic based on actual DB check
            // responseTime: dbStatus.responseTime
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
      throw new AppError('Service unavailable', 503);
    }
  });

  // Socket.io health check
  fastify.get('/health/socket', { config: { isPublic: true } }, async (request, reply) => {
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
      throw new AppError(error instanceof Error ? error.message : 'Unknown socket error', 503);
    }
  });
};

export default healthRoutes;
