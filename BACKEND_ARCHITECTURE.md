# OmniTask — Backend Architecture & System Safeguards

> **Purpose:** Definitive, battle-tested Fastify + Prisma backend architecture for OmniTask. This document outlines the structural foundation and the safeguards for multi-tenant isolation, transaction consistency, and real-time security.

---

## 1. Folder Structure

This structure separates concerns across modules while centralizing core infrastructure (database, queues, middleware).

```text
src/
├── app.ts                            # Fastify instance & plugin registration
├── server.ts                         # Server entry point & listener
│
├── config/                           
│   ├── env.ts                        # Type-safe environment variables (Zod)
│   └── rate-limits.ts                # Per-module rate limit configurations
│
├── plugins/                          
│   ├── db.plugin.ts                  # Extended Prisma Client instantiation
│   ├── redis.plugin.ts               # Redis connection for caching & idempotency
│   ├── queue.plugin.ts               # BullMQ connection & job registration
│   ├── socket.plugin.ts              # Socket.io initialization & middleware
│   └── swagger.plugin.ts             # OpenAPI/Swagger documentation
│
├── modules/                          # Domain-driven feature modules
│   ├── auth/                         # Authentication & Session logic
│   ├── organizations/                # Multi-tenant organization management
│   ├── channels/                     # Channel & Membership logic
│   ├── tasks/                        # Task, Subtask & Assignment management
│   │   ├── task.routes.ts            # Fastify route definitions
│   │   ├── task.controller.ts        # HTTP request handling
│   │   ├── task.service.ts           # Business logic & Service-layer validation
│   │   └── task.repository.ts        # Database access layer
│   └── audit/                        # Activity log querying service
|   └── storage/                      # File attachment & storage logic
│
├── common/                           # Shared infrastructure & utilities
│   ├── database/                     
│   │   └── prisma-client.ts          # Base Prisma Client configuration
│   ├── repositories/                 
│   │   └── base.repository.ts        # Centralized Multi-tenant & Soft-delete logic
│   ├── middlewares/                  
│   │   └── auth.middleware.ts        # JWT & Org isolation context
│   ├── errors/                       
│   │   └── error-handler.ts          # Global Fastify error interceptor
│   └── utils/                        
│       ├── AppError.ts               # Standardized Error class
│       └── response.ts               # Unified API response builders
│
├── websockets/                       # Real-time communication layer
│   ├── socket-manager.ts             # [Planned] Room management & broadcasting
│   └── handlers/                     # [Planned] Domain-specific event handlers
│
├── workers/                          # Background job processors (BullMQ)
│   ├── email.worker.ts               # Transactional email processing
│   ├── notification.worker.ts        # Push & In-app notification delivery
│   └── audit.worker.ts               # Async activity log persistence
│
├── services/                         # Cross-cutting infrastructure services
│   └── upload.service.ts             # Secure file uploads (MIME/Magic number checks)
│
└── prisma/                           
    └── schema.prisma                 # Primary database schema

tests/                                
├── e2e/                              # Supertest API flow tests
├── integration/                      # DB Transaction & Socket payload tests
└── unit/                             # Isolated service & logic testing
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
