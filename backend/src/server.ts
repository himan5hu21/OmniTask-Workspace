import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import socketPlugin from '@/plugins/socket';
import authRoutes from '@/routes/auth';
import taskRoutes from '@/routes/tasks';
import orgRoutes from '@/routes/organizations';
import healthRoutes from '@/routes/health';
import jwt from '@fastify/jwt';
import { setupErrorHandler } from '@/middlewares/errorHandlers';
import { verifyToken } from '@/middlewares/auth.middleware';

// Load environment variables
dotenv.config();

const buildServer = async () => {
  const app = Fastify({ 
    logger: {
      level: 'debug',
      transport: {
        target: 'pino-pretty', // Log ne mast format ma dekhadva (pnpm add -D pino-pretty)
      }
    } 
  });

  setupErrorHandler(app);

  // 1. Core Plugins Register Karo
  await app.register(cors, {
    origin: true, // Allow all origins for development
    credentials: true,
  });
  await app.register(socketPlugin);
  
  // Register JWT plugin
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret'
  });

  app.addHook('preHandler', verifyToken);

  // 2. Routes Register Karo (prefix aapvathi routes organized rahe chhe)
  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(taskRoutes, { prefix: '/api/v1' });
  await app.register(orgRoutes, { prefix: '/api/v1' });

  return app;
};

const start = async () => {
  try {
    const app = await buildServer();
    const PORT = Number(process.env.PORT) || 8000;
    
    // host: '0.0.0.0' rakhvu best chhe Docker ke cloud hosting mate
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`Synkro server running on http://localhost:${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();