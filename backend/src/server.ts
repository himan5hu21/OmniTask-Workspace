import "dotenv/config";
import Fastify from 'fastify';
import cors from '@fastify/cors';
import socketPlugin from '@/plugins/socket';
import authRoutes from '@/modules/auth/auth.routes';
import taskRoutes from '@/modules/task/task.routes';
import orgRoutes from '@/modules/organizations/organizations.routes';
import channelRoutes from '@/modules/channels/channels.routes';
import messageRoutes from '@/modules/message/message.routes';
import healthRoutes from '@/routes/health.routes';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupErrorHandler } from '@/middlewares/errorHandlers';
import { verifyToken } from '@/middlewares/auth.middleware';
import attachmentRoutes from '@/modules/attachment/attachment.routes';
import { prisma } from "@/lib/database";
import swaggerPlugin from '@/plugins/swagger';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';


// dotenv/config ensures env vars are loaded before any other imports

const isProd = process.env.NODE_ENV === "production";

const buildServer = async () => {
  const app = Fastify({
    disableRequestLogging: true,
    logger: isProd
      ? {
        level: "info"
      }
      : {
        level: "debug",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname,reqId",
            singleLine: true,
          }
        }
      }
  });

  setupErrorHandler(app);

  // Set up Zod type provider for Swagger and validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);


  // 1. Core Plugins Register Karo
  await app.register(cors, {
    origin: true, // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  await app.register(socketPlugin);

  // 2. Swagger Plugin Register Karo (Must be before routes)
  await app.register(swaggerPlugin);


  // Register Multipart for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });
  
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'omnitask-secret',
  });

  // Register Static for serving uploads
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '../uploads'),
    prefix: '/uploads',
    setHeaders: (res, path) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Allow images to be viewed inline, force download for others
      const isViewable = /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(path);
      if (!isViewable) {
        res.setHeader('Content-Disposition', 'attachment');
      }
    }
  });

  // Register JWT plugin
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }
  await app.register(jwt, {
    secret: process.env.JWT_SECRET
  });

  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for OPTIONS requests, public routes, and uploads
    if (
      request.method === 'OPTIONS' || 
      request.routeOptions.config?.isPublic ||
      request.url.startsWith('/uploads') ||
      request.url.startsWith('/docs')
    ) {
      return;
    }
    await verifyToken(request, reply);
  });

  // Custom request summary hook
  app.addHook('onResponse', (req, reply, done) => {
    // 👈 '→' ni jagya e '->' vapryu
    req.log.info(
      `${req.method} ${req.url} -> ${reply.statusCode} (${reply.elapsedTime.toFixed(2)} ms)`
    );
    if (reply.elapsedTime > 500) {
      req.log.warn(`Slow API: ${req.method} ${req.url}`);
    }
    done();
  });

  // 2. Routes Register Karo (prefix aapvathi routes organized rahe chhe)
  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(taskRoutes, { prefix: '/api/v1' });
  await app.register(orgRoutes, { prefix: '/api/v1' });
  await app.register(channelRoutes, { prefix: '/api/v1' });
  await app.register(messageRoutes, { prefix: '/api/v1' });
  await app.register(attachmentRoutes, { prefix: '/api/v1' });

  // 3. Prisma logs ko Fastify logger ke through pass karo
  if (!isProd) {
    prisma.$on('query', (e) => {
      // app.log.debug(`DB (${e.duration.toFixed(2)}ms) - ${e.query}`);

      let executableQuery = e.query;
      let params: any[] = [];
      try {
        // Parse the query to extract parameters
        // This is a simplified parser - you might need to adjust based on your needs
        params = typeof e.params === 'string' ? JSON.parse(e.params) : e.params;
      } catch (error) {
        app.log.warn('Failed to parse query parameters', undefined, error);
      }

      if (params && Array.isArray(params)) {
        params.forEach((param, index) => {
          const valueToReplace = typeof param === 'string' ? `'${param}'` : param;
          executableQuery = executableQuery.replace(
            new RegExp(`\\$${index + 1}(?!\\d)`, 'g'),
            valueToReplace
          );
        });
      }
      app.log.debug(`\nDB (${e.duration.toFixed(2)}ms) - ${executableQuery}`);
    });
  }

  prisma.$on('error', (e) => {
    app.log.error(e, 'Prisma Error');
  });

  prisma.$on('warn', (e) => {
    app.log.warn(e, 'Prisma Warning');
  });

  return app;
};

const start = async () => {
  try {
    const app = await buildServer();
    const PORT = Number(process.env.PORT) || 8000;

    // Global error handlers
    process.on('uncaughtException', (err) => {
      app.log.fatal(err);
      process.exit(1);
    });

    process.on('unhandledRejection', (err) => {
      app.log.fatal(err);
      process.exit(1);
    });

    // host: '0.0.0.0' rakhvu best chhe Docker ke cloud hosting mate
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`omnitask server running on http://localhost:${PORT}`);

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
        process.exit(0);
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