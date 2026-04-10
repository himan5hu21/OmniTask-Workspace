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
export default fp(socketPlugin, { name: 'synkro-socket' });