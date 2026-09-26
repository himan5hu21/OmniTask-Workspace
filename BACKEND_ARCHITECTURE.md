# OmniTask — Backend Architecture & System Safeguards

> **Purpose:** Definitive, battle-tested Fastify + Prisma backend architecture for OmniTask. This document outlines the structural foundation and the safeguards for multi-tenant isolation, transaction consistency, and real-time security.

---

## 1. Folder Structure

This structure separates concerns across modules while centralizing core infrastructure (database, queues, middleware).

```text
backend/src/
├── server.ts                         # Fastify server entry point & plugin bootstrap
│
├── modules/                          # Domain-driven feature modules
│   ├── auth/                         # JWT login, register, refresh tokens, password reset
│   │   ├── auth.routes.ts            # Fastify route definitions
│   │   ├── auth.controller.ts        # HTTP request handling
│   │   ├── auth.service.ts           # Authentication business logic
│   │   ├── auth.repository.ts        # User & Token database queries
│   │   └── auth.schema.ts            # Zod input/output schemas
│   ├── organizations/                # Multi-tenant organization CRUD & member management
│   ├── channels/                     # Channel CRUD, membership & roles
│   ├── task/                         # Kanban boards, tasks, subtask hierarchy, assignees
│   ├── message/                      # Channel chat & 1-on-1 direct conversations
│   ├── notification/                 # In-app notifications & unread summary
│   └── attachment/                   # File uploads, Cloudinary integration & streaming
│
├── plugins/                          # Fastify plugins
│   ├── socket.ts                     # Socket.IO authenticated server & room manager
│   └── swagger.ts                    # OpenAPI / Swagger UI documentation
│
├── middlewares/                      # HTTP request middlewares
│   ├── auth.middleware.ts            # JWT authentication & user verification
│   └── errorHandlers.ts              # Global error handling & Zod validation interceptor
│
├── lib/                              # Infrastructure & third-party integrations
│   ├── database.ts                   # Neon PostgreSQL Prisma Client singleton
│   ├── storage.ts                    # Cloudinary upload, destruction & stream helpers
│   └── email.ts                      # Resend transactional email integration
│
├── utils/                            # Shared utilities
│   ├── permissions.ts                # PermissionGuard (Tier-1 Org & Tier-2 Channel checks)
│   ├── permission-matrices.ts        # Workspace RBAC matrices via shared/permission-matrices.ts
│   └── logger.ts                     # Pino logger configuration
│
├── routes/                           
│   └── health.routes.ts              # System health & uptime check
│
├── types/                            
│   └── fastify.d.ts                  # FastifyRequest user payload extensions
│
└── prisma/                           # Database Schema & Migrations
    ├── schema/                       # Modular Prisma schemas (auth, org, task, etc.)
    ├── migrations/                   # PostgreSQL migration history
    └── seed.ts                       # Database seeding script
```

---

## 2. Resolving System Logical Gaps

A production-grade backend must guarantee consistency across distributed components (DB, Cache, Sockets).

### A. Multi-Tenant Isolation & Soft Deletes
We use **Prisma Client Extensions** to ensure security is handled at the infrastructure level, not just the service level.
* **Isolation:** Every update/delete query automatically validates the `orgId` to prevent cross-tenant data leakage.
* **Soft Deletes:** Global query filters automatically exclude rows where `deletedAt` is set, ensuring data is never permanently lost while remaining invisible to the application.

```typescript
// common/database/prisma-client.ts
export const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        args.where = { ...args.where, deletedAt: null }; // Global soft-delete filter
        return query(args);
      },
    },
    task: {
      async update({ args, query }) {
        // Enforce orgId on every task update
        if (!args.where.orgId) throw new Error('SECURITY_ALERT: Missing orgId in update');
        return query(args);
      }
    }
  },
});
```

### B. Transaction Consistency (Outbox Pattern)
To prevent the database and real-time state from drifting apart, we use a **Transactional Outbox** pattern. Events are only queued after the database commit is successful.

```typescript
// modules/tasks/task.service.ts
export const createTask = async (data: TaskInput, userId: string, orgId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({ data });
    
    // Inline Audit Logging inside the transaction
    await tx.auditLog.create({
      data: { action: 'task.create', entityId: task.id, userId, orgId, changes: data }
    });
    
    return task;
  });

  // Event pushed to Queue ONLY after successful database commit
  await queue.add(events.TASK_CREATED, { task: result, channelId: data.channelId });

  return result;
};
```

### C. Idempotency & Rate Limiting
* **Idempotency:** The `idempotency.ts` middleware uses Redis to store the result of `POST` requests based on an `X-Idempotency-Key` header. This prevents duplicate operations during network retries.
* **Rate Limiting:** Defined per module in `config/rate-limits.ts`. Sensitive routes (Login) use strict windows, while high-frequency routes (Chat) allow for larger bursts.

### D. WebSocket Security & Revalidation
WebSocket connections are not "fire and forget." We implement active revalidation to ensure demoted users lose access instantly.
* **Room Management:** When a user's permissions change, the `ws-auth.ts` service forces the user's socket to leave forbidden rooms (`socketsLeave`).
* **Session Kicking:** Critical role updates trigger a `ROLE_UPDATED` event, forcing the client to re-authenticate or refresh their capability set.

### E. Defensive Service Validation
* **Service-Layer Zod:** We don't just validate at the route level. Services use Zod schemas internally to ensure that even cross-service calls maintain data integrity.
* **Secure Uploads:** `upload.service.ts` validates files using **Magic Numbers** (byte signatures) rather than just file extensions, preventing malicious file injections.

### F. Advanced Pagination & Caching
* **Consistent Lists:** `advanced-pagination.ts` standardizes cursor-based pagination across all modules, preventing memory issues during large list fetches.
* **Cache Invalidation:** Heavy read operations (like permission sets) are cached in Redis and invalidated immediately upon any relevant mutation.
