import fp from 'fastify-plugin';
import { Server } from 'socket.io';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

// TypeScript ne khabar pade ke fastify.io exist kare chhe
declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

const socketPlugin: FastifyPluginAsync = async (fastify, options) => {
  const io = new Server(fastify.server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000', // Allow frontend origin
      credentials: true, // Allow cookies/credentials
      methods: ['GET', 'POST'],
    }
  });

  // Global access aapo
  fastify.decorate('io', io);

  // Graceful Shutdown
  fastify.addHook('onClose', (instance, done) => {
    instance.log.info('Closing Socket.io connections...');
    instance.io.close();
    done();
  });

  // Base connection handling
  io.on('connection', (socket) => {
    fastify.log.info(`[Socket] Navo user aavyo: ${socket.id}`);

    // ==========================================
    // 🛠️ CHANNEL EVENTS
    // ==========================================

    // Join channel room
    socket.on('channel:join', ({ channelId, userId }) => {
      socket.join(`channel:${channelId}`);
      fastify.log.info(`[Socket] User ${userId} joined channel:${channelId}`);

      // Notify others in the channel
      socket.to(`channel:${channelId}`).emit('channel:user_joined', {
        channelId,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // Leave channel room
    socket.on('channel:leave', ({ channelId, userId }) => {
      socket.leave(`channel:${channelId}`);
      fastify.log.info(`[Socket] User ${userId} left channel:${channelId}`);

      // Notify others in the channel
      socket.to(`channel:${channelId}`).emit('channel:user_left', {
        channelId,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // Join organization room
    socket.on('organization:join', ({ orgId, userId }) => {
      socket.join(`org:${orgId}`);
      fastify.log.info(`[Socket] User ${userId} joined org:${orgId}`);
    });

    // Leave organization room
    socket.on('organization:leave', ({ orgId, userId }) => {
      socket.leave(`org:${orgId}`);
      fastify.log.info(`[Socket] User ${userId} left org:${orgId}`);
    });

    // ==========================================
    // 🛠️ MESSAGE EVENTS
    // ==========================================

    // Typing indicator
    socket.on('message:typing', ({ channelId, userId }) => {
      socket.to(`channel:${channelId}`).emit('channel:typing', {
        channelId,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // Stop typing indicator
    socket.on('message:stop_typing', ({ channelId, userId }) => {
      socket.to(`channel:${channelId}`).emit('channel:stop_typing', {
        channelId,
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // ==========================================
    // 🛠️ SAMPLE TEST ROUTE / EVENT
    // ==========================================
    socket.on('test:ping', (data) => {
      // Console ni jagya e fastify.log no upyog karyo jethi logs proper format ma aave
      fastify.log.info({ data }, `[Socket] Ping aavyo from ${socket.id}`);

      // Client ne pacho jawab (Pong) aapo
      socket.emit('test:pong', {
        success: true,
        message: 'Hello OmniTask Workspace mathi!',
        receivedData: data,
        serverTime: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      fastify.log.info(`[Socket] User gayo: ${socket.id}`);
    });
  });
};

// fp() thi wrap karvathi aa plugin globally available thai jase
export default fp(socketPlugin, { name: 'omnitask-socket' });