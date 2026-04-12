import "dotenv/config";
import Fastify from 'fastify';
import cors from '@fastify/cors';
import socketPlugin from '@/plugins/socket';
import authRoutes from '@/routes/auth';
import taskRoutes from '@/routes/tasks';
import orgRoutes from '@/routes/organizations';
import healthRoutes from '@/routes/health';
import jwt from '@fastify/jwt';
import { setupErrorHandler } from '@/middlewares/errorHandlers';
import { verifyToken } from '@/middlewares/auth.middleware';
import { prisma } from "./lib/database";

// dotenv/config ensures env vars are loaded before any other imports

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

  // 👈 AHIYA GLOBAL ZOD VALIDATOR UMERVO
  app.setValidatorCompiler(({ schema }: { schema: any }) => {
    return (data) => {
      try {
        return { value: schema.parse(data) };
      } catch (error) {
        // ZodError throw thase je sidho tamara errorHandlers ma jase
        throw error; 
      }
    };
  });

  // 1. Core Plugins Register Karo
  await app.register(cors, {
    origin: true, // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(socketPlugin);
  
  // Register JWT plugin
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'fallback-secret'
  });

  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for OPTIONS requests (CORS preflight) and public routes
    if (request.method === 'OPTIONS' || request.routeOptions.config?.isPublic) {
      return;
    }
    await verifyToken(request, reply);
  });

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

    // Graceful shutdown handlers 
    const gracefulShutdown = async (signal: string) => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      
      const shutdownTimeout = setTimeout(() => {
        app.log.error('Graceful shutdown timed out, forcing exit...');
        process.exit(1);
      }, 5000);

      try {
        await app.close();
        
        // 🔥 Prisma ne disconnect karvu JARURI chhe jethi connection hang na thay
        await prisma.$disconnect();
        app.log.info('Prisma disconnected gracefully');

        clearTimeout(shutdownTimeout);
        app.log.info('Server closed successfully');
        
        process.removeAllListeners(signal);
        process.kill(process.pid, signal);
      } catch (err) {
        clearTimeout(shutdownTimeout);
        app.log.error(err, 'Error during shutdown:');
        process.exit(1);
      }
    };

    // Correctly pass the signal strings
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    // Windows-specific signal
    process.on('SIGBREAK', () => gracefulShutdown('SIGBREAK'));

    process.once('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();