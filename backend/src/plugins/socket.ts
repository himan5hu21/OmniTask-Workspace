import fp from 'fastify-plugin';
import { Server, Socket } from 'socket.io';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '@/lib/database';

// TypeScript ne khabar pade ke fastify.io exist kare chhe
declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

interface SocketData {
  user: {
    userId: string;
    email: string;
    name: string;
    tokenVersion: number;
    is_superadmin: boolean;
  };
}

interface ServerToClientEvents {
  'channel:user_joined': (data: { channelId: string; userId: string; name: string; timestamp: string }) => void;
  'channel:typing': (data: { channelId: string; userId: string; name: string; timestamp: string }) => void;
  'channel:stop_typing': (data: { channelId: string; userId: string; timestamp: string }) => void;
  'error': (data: { message: string }) => void;
}

interface ClientToServerEvents {
  'channel:join': (data: { channelId: string }) => void;
  'channel:leave': (data: { channelId: string }) => void;
  'organization:join': (data: { orgId: string }) => void;
  'organization:leave': (data: { orgId: string }) => void;
  'message:typing': (data: { channelId: string }) => void;
  'message:stop_typing': (data: { channelId: string }) => void;
}

interface InterServerEvents {}

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

  // ==========================================
  // 🛡️ SOCKET AUTHENTICATION MIDDLEWARE
  // ==========================================
  io.use(async (socket: Socket, next) => {
    try {
      const authHeader = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!authHeader) {
        return next(new Error('Authentication error: Token missing'));
      }

      const token = authHeader.replace('Bearer ', '');
      const payload = fastify.jwt.verify(token) as any;

      if (!payload || !payload.userId) {
        return next(new Error('Authentication error: Invalid token'));
      }

      // Check for session revocation (Layer 1 of security plan)
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { token_version: true, is_active: true }
      });

      if (!user || !user.is_active) {
        return next(new Error('Authentication error: User inactive'));
      }

      if (user.token_version !== payload.tokenVersion) {
        return next(new Error('Authentication error: Session revoked'));
      }

      // Store user info in socket
      socket.data.user = payload;
      next();
    } catch (err: any) {
      fastify.log.error(err, '[Socket Auth Error]');
      // Pass the specific error message to the client for debugging
      next(new Error(err.message || 'Authentication error'));
    }
  });

  // Graceful Shutdown — must await so port is released before Fastify reports done
  fastify.addHook('onClose', async () => {
    await io.close();
  });

  // Base connection handling
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    const user = socket.data.user;
    fastify.log.info(`[Socket] Navo user aavyo: ${user.email} (${socket.id})`);

    // Auto-join user room for private notifications
    socket.join(`user:${user.userId}`);

    // ==========================================
    // 🛠️ CHANNEL EVENTS
    // ==========================================

    // Join channel room with authorization
    socket.on('channel:join', async ({ channelId }) => {
      try {
        const userId = user.userId;

        // AUTH CHECK: Must be Org Owner/Admin OR a Channel Member
        // First, get the org_id for this channel
        const channel = await prisma.channel.findUnique({
          where: { id: channelId },
          select: { org_id: true }
        });

        if (!channel) return;

        // Check Org Role
        const orgMembership = await prisma.organizationMember.findUnique({
          where: { organization_id_user_id: { organization_id: channel.org_id, user_id: userId } },
          select: { role: true }
        });

        const isOrgAdmin = orgMembership?.role === 'ADMIN' || orgMembership?.role === 'OWNER';

        if (!isOrgAdmin) {
          // Check Channel Membership
          const channelMembership = await prisma.channelMember.findUnique({
            where: { user_id_channel_id: { user_id: userId, channel_id: channelId } }
          });

          if (!channelMembership) {
            fastify.log.warn(`[Socket] User ${userId} unauthorized for channel:${channelId}`);
            socket.emit('error', { message: 'Unauthorized channel access' });
            return;
          }
        }

        socket.join(`channel:${channelId}`);
        fastify.log.info(`[Socket] User ${user.email} joined channel:${channelId}`);

        // Notify others
        socket.to(`channel:${channelId}`).emit('channel:user_joined', {
          channelId,
          userId,
          name: user.name,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        fastify.log.error(err, '[Socket Channel Join Error]');
      }
    });

    // Leave channel room
    socket.on('channel:leave', ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
      fastify.log.info(`[Socket] User ${user.email} left channel:${channelId}`);
    });

    // Join organization room with authorization
    socket.on('organization:join', async ({ orgId }) => {
      try {
        const orgMembership = await prisma.organizationMember.findUnique({
          where: { organization_id_user_id: { organization_id: orgId, user_id: user.userId } }
        });

        if (!orgMembership && !user.is_superadmin) {
          fastify.log.warn(`[Socket] User ${user.userId} unauthorized for org:${orgId}`);
          return;
        }

        socket.join(`org:${orgId}`);
        fastify.log.info(`[Socket] User ${user.email} joined org:${orgId}`);
      } catch (err) {
        fastify.log.error(err, '[Socket Org Join Error]');
      }
    });

    // Leave organization room
    socket.on('organization:leave', ({ orgId }) => {
      socket.leave(`org:${orgId}`);
    });

    // ==========================================
    // 🛠️ MESSAGE EVENTS
    // ==========================================

    socket.on('message:typing', ({ channelId }) => {
      // Security check: must be in the room to emit typing
      if (socket.rooms.has(`channel:${channelId}`)) {
        socket.to(`channel:${channelId}`).emit('channel:typing', {
          channelId,
          userId: user.userId,
          name: user.name,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('message:stop_typing', ({ channelId }) => {
      if (socket.rooms.has(`channel:${channelId}`)) {
        socket.to(`channel:${channelId}`).emit('channel:stop_typing', {
          channelId,
          userId: user.userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('disconnect', () => {
      fastify.log.info(`[Socket] User gayo: ${socket.id}`);
    });
  });
};

// fp() thi wrap karvathi aa plugin globally available thai jase
export default fp(socketPlugin, { name: 'omnitask-socket' });