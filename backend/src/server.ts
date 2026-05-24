import "dotenv/config";
import Fastify from 'fastify';
import cors from '@fastify/cors';
import socketPlugin from '@/plugins/socket';
import authRoutes from '@/modules/auth/auth.routes';
import taskRoutes from '@/modules/task/task.routes';
import orgRoutes from '@/modules/organizations/organizations.routes';
import channelRoutes from '@/modules/channels/channels.routes';
import messageRoutes from '@/modules/message/message.routes';
import notificationRoutes from '@/modules/notification/notification.routes';
import healthRoutes from '@/routes/health.routes';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { setupErrorHandler } from '@/middlewares/errorHandlers';
import { verifyToken } from '@/middlewares/auth.middleware';
import attachmentRoutes from '@/modules/attachment/attachment.routes';
import { prisma } from "@/lib/database";
import type { Prisma } from '@/generated/prisma/client';
import swaggerPlugin from '@/plugins/swagger';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

// dotenv/config ensures env vars are loaded before any other imports

const isProd = process.env.NODE_ENV === "production";
const onPrismaEvent = prisma.$on.bind(prisma) as (
  eventType: 'query' | 'error' | 'warn',
  handler: (event: Prisma.QueryEvent | Prisma.LogEvent) => void
) => void;

const isPrismaQueryEvent = (
  event: Prisma.QueryEvent | Prisma.LogEvent
): event is Prisma.QueryEvent => {
  return 'query' in event && 'params' in event && 'duration' in event;
};

const isPrismaLogEvent = (
  event: Prisma.QueryEvent | Prisma.LogEvent
): event is Prisma.LogEvent => {
  return 'message' in event;
};

let shuttingDown = false;

const buildServer = async () => {
  const app = Fastify({
    disableRequestLogging: true,
    forceCloseConnections: true,
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
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });
  
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'omnitask-secret',
  });

  // Register Static for serving public uploads (like user avatars)
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '../uploads'),
    prefix: '/uploads/user',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  });

  // Authenticated Secure Serving of Message Attachments
  app.get('/uploads/message/:filename', async (request, reply) => {
    try {
      await verifyToken(request, reply);
    } catch (err) {
      return reply.code(401).send({ success: false, message: 'Unauthorized. Please login.' });
    }

    const { filename } = request.params as { filename: string };
    const user = (request as any).user;

    if (!user || !user.userId) {
      return reply.code(401).send({ success: false, message: 'Unauthorized.' });
    }

    // 2. Fetch the attachment from the database
    const attachment = await prisma.messageAttachment.findFirst({
      where: {
        file_url: {
          endsWith: `message/${filename}`
        }
      },
      include: {
        channel_message: true,
        direct_message: true
      }
    });

    // 3. Perform security check: is the user part of this channel or direct conversation?
    if (attachment) {
      if (attachment.channel_message_id && attachment.channel_message) {
        const isMember = await prisma.channelMember.findFirst({
          where: {
            user_id: user.userId,
            channel_id: attachment.channel_message.channel_id
          }
        });
        if (!isMember) {
          return reply.code(403).send({ success: false, message: 'Forbidden. You are not a member of this channel.' });
        }
      } else if (attachment.direct_message_id && attachment.direct_message) {
        const conversation = await prisma.directConversation.findFirst({
          where: {
            id: attachment.direct_message.conversation_id
          }
        });
        if (conversation && conversation.user1_id !== user.userId && conversation.user2_id !== user.userId) {
          return reply.code(403).send({ success: false, message: 'Forbidden. You are not part of this conversation.' });
        }
      }
    }
    if (!attachment) {
      return reply.code(404).send({ success: false, message: 'File not found.' });
    }

    // 4. Determine inline vs download based on environment and browser request context
    const isProd = process.env.NODE_ENV === 'production';
    const referer = request.headers.referer;
    const secFetchMode = request.headers['sec-fetch-mode'];
    const secFetchDest = request.headers['sec-fetch-dest'];

    const isDirectAccess = !referer || secFetchMode === 'navigate' || secFetchDest === 'document';

    // In production, direct browser address bar accesses are forced to download
    // Support forcing download via query parameter or direct access in production
    const forceDownload = (request.query as { download?: string }).download === 'true';

    if (forceDownload || (isProd && isDirectAccess)) {
      const downloadName = attachment ? attachment.file_name : filename;
      reply.header('Content-Disposition', `attachment; filename="${downloadName}"`);
    } else {
      // Inline viewable check
      const checkName = attachment ? attachment.file_name : filename;
      const isViewable = /\.(txt|jpg|jpeg|png|gif|webp|pdf|mp4|webm|ogg|mov)$/i.test(checkName);
      if (!isViewable) {
        reply.header('Content-Disposition', `attachment; filename="${checkName}"`);
      }
    }

    return reply.sendFile(`message/${filename}`);
  });

  app.get('/uploads/task/:filename', async (request, reply) => {
    try {
      await verifyToken(request, reply);
    } catch (err) {
      return reply.code(401).send({ success: false, message: 'Unauthorized. Please login.' });
    }

    const { filename } = request.params as { filename: string };
    const user = (request as any).user;

    if (!user || !user.userId) {
      return reply.code(401).send({ success: false, message: 'Unauthorized.' });
    }

    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        file_url: {
          endsWith: `task/${filename}`
        }
      },
      include: {
        task: true
      }
    });

    if (!attachment || !attachment.task) {
      return reply.code(404).send({ success: false, message: 'File not found.' });
    }

    const isMember = await prisma.channelMember.findFirst({
      where: {
        user_id: user.userId,
        channel_id: attachment.task.channel_id
      }
    });

    if (!isMember) {
      return reply.code(403).send({ success: false, message: 'Forbidden. You are not a member of this channel.' });
    }

    const isProd = process.env.NODE_ENV === 'production';
    const referer = request.headers.referer;
    const secFetchMode = request.headers['sec-fetch-mode'];
    const secFetchDest = request.headers['sec-fetch-dest'];

    const isDirectAccess = !referer || secFetchMode === 'navigate' || secFetchDest === 'document';
    const forceDownload = (request.query as { download?: string }).download === 'true';

    if (forceDownload || (isProd && isDirectAccess)) {
      reply.header('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
    } else {
      const isViewable = /\.(txt|jpg|jpeg|png|gif|webp|pdf|mp4|webm|ogg|mov)$/i.test(attachment.file_name);
      if (!isViewable) {
        reply.header('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
      }
    }

    return reply.sendFile(`task/${filename}`);
  });

  // Register JWT plugin
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }
  await app.register(jwt, {
    secret: process.env.JWT_SECRET,
    cookie: {
      cookieName: 'token',
      signed: false
    }
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
  await app.register(notificationRoutes, { prefix: '/api/v1' });
  await app.register(attachmentRoutes, { prefix: '/api/v1' });

  // 3. Prisma logs ko Fastify logger ke through pass karo
  if (!isProd) {
    onPrismaEvent('query', (event) => {
      if (!isPrismaQueryEvent(event)) {
        return;
      }

      // app.log.debug(`DB (${e.duration.toFixed(2)}ms) - ${e.query}`);

      let executableQuery = event.query;
      let params: any[] = [];
      try {
        // Parse the query to extract parameters
        // This is a simplified parser - you might need to adjust based on your needs
        params = typeof event.params === 'string' ? JSON.parse(event.params) : event.params;
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
      app.log.debug(`\nDB (${event.duration.toFixed(2)}ms) - ${executableQuery}`);
    });
  }

  onPrismaEvent('error', (event) => {
    if (!isPrismaLogEvent(event)) {
      return;
    }

    app.log.error(event, 'Prisma Error');
  });

  onPrismaEvent('warn', (event) => {
    if (!isPrismaLogEvent(event)) {
      return;
    }

    app.log.warn(event, 'Prisma Warning');
  });

  return app;
};

const start = async () => {
  try {
    const app = await buildServer();
    const PORT = Number(process.env.PORT) || 8000;
    let serverStarted = false;

    const closeApp = async (exitCode = 0) => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;

      try {
        if (serverStarted) {
          await app.close();
        }
      } catch (err) {
        app.log.error(err, 'Failed to close Fastify cleanly');
        exitCode = 1;
      }

      try {
        await prisma.$disconnect();
      } catch (err) {
        app.log.error(err, 'Failed to disconnect Prisma cleanly');
        exitCode = 1;
      }

      process.exit(exitCode);
    };

    // Global error handlers
    process.on('uncaughtException', (err) => {
      app.log.fatal(err);
      void closeApp(1);
    });

    process.on('unhandledRejection', (err) => {
      app.log.fatal(err);
      void closeApp(1);
    });

    process.once('SIGINT', () => {
      void closeApp(0);
    });
    process.once('SIGTERM', () => {
      void closeApp(0);
    });
    process.once('SIGUSR2', () => {
      void closeApp(0);
    });

    // host: '0.0.0.0' rakhvu best chhe Docker ke cloud hosting mate
    await app.listen({ port: PORT, host: '0.0.0.0' });
    serverStarted = true;
    app.log.info(`omnitask server running on http://localhost:${PORT}`);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
