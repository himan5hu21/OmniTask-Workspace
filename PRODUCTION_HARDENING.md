# OmniTask — Production Hardening Checklist

> **Stage:** Final polish — implement AFTER core features are complete.
> **Why this file exists:** These items are NOT needed during active development.
> They are operational, security, and performance polish that should be added
> just before the first real production deployment.
>
> **Reference:** These gaps were identified during v3 architecture review.
> Core architecture, permissions, security, and frontend sync are already handled
> in `ROLE_MANAGEMENT_PLAN.md` and `ROLE_PERMISSIONS.md`.

---

## Status

| Item | Priority | Status |
|------|----------|--------|
| Rate Limiting | 🔴 Critical | ❌ TODO |
| File Upload Security | 🔴 Critical | ❌ TODO |
| OWNER Channel Access (edge case clarification) | 🟡 Medium | ❌ TODO |
| Database Transaction Rules | 🔴 Critical | ❌ TODO |
| System Limits | 🟢 Low | ❌ TODO |

> [!NOTE]
> **Request-level caching** (`req._cache`) is already documented in
> `ROLE_MANAGEMENT_PLAN.md` — Section 9, Performance rules. ✅ No action needed.

---

## 1. 🔴 Rate Limiting

> **Why this matters:** Without rate limiting, your system is vulnerable to brute-force
> login attacks, message spam, and API abuse. This is not a feature — it's basic
> operational security. Required before going live.

### Implementation Plan

**Library:** Use `express-rate-limit` (or `@fastify/rate-limit` if switching to Fastify).
For distributed/multi-instance deployments, back the store with Redis.

```ts
// src/middlewares/rateLimit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Strict — for auth routes
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 attempts per IP per 15 min
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
  standardHeaders: true,
  store: new RedisStore({ /* redis client */ }),
});

// Moderate — for message sends
export const messageSendRateLimit = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 60,                    // 60 messages per minute per user
  keyGenerator: (req) => req.user?.userId ?? req.ip,
});

// Moderate — for task create/update
export const taskWriteRateLimit = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 100,                   // 100 task writes per minute per user
  keyGenerator: (req) => req.user?.userId ?? req.ip,
});
```

### Route Application

```ts
// Auth routes (strict)
router.post('/auth/login',   authRateLimit, loginHandler);
router.post('/auth/refresh', authRateLimit, refreshHandler);
router.post('/auth/register', authRateLimit, registerHandler);

// Message routes (moderate)
router.post('/channels/:channel_id/messages', messageSendRateLimit, sendMessageHandler);

// Task routes (moderate)
router.post('/tasks',        taskWriteRateLimit, createTaskHandler);
router.patch('/tasks/:id',   taskWriteRateLimit, updateTaskHandler);
```

### Rate Limit Headers

Always return these headers so clients can handle limits gracefully:

```
X-RateLimit-Limit:     60
X-RateLimit-Remaining: 43
X-RateLimit-Reset:     1716000000
Retry-After:           60  (only when limit is hit)
```

### Error Response

```json
{
  "error": "Too many requests. Please slow down.",
  "code": "RATE_LIMITED",
  "status": 429,
  "retryAfter": 60
}
```

---

## 2. 🔴 File Upload Security

> **Why this matters:** Unrestricted file uploads are a common attack vector.
> Without MIME validation and size limits, attackers can upload executable scripts,
> oversized files to exhaust storage, or bypass content policies.
> Add this when the file/attachment feature is being built.

### Validation Rules

```ts
// src/middlewares/fileUpload.ts

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'application/pdf',
  'text/plain',
  'application/zip',
  // Add more as needed — be EXPLICIT. Default is DENY.
]);

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.sh', '.bat', '.cmd', '.ps1', '.msi',
  '.js',  '.ts', '.py', '.rb',  '.php', '.pl',
  '.dll', '.so',  '.bin',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
```

### Middleware Implementation

```ts
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) return next();

  const { mimetype, size, originalname } = req.file;
  const ext = path.extname(originalname).toLowerCase();

  // 1. Block dangerous extensions
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return res.status(400).json({ error: 'File type not allowed', code: 'INVALID_FILE_TYPE' });
  }

  // 2. Validate MIME type strictly
  if (!ALLOWED_MIME_TYPES.has(mimetype)) {
    return res.status(400).json({ error: 'File type not allowed', code: 'INVALID_FILE_TYPE' });
  }

  // 3. Enforce size limit
  if (size > MAX_FILE_SIZE) {
    return res.status(413).json({ error: 'File too large. Max size is 10MB', code: 'FILE_TOO_LARGE' });
  }

  // 4. Rename file on disk to a random UUID — never trust original filename
  // This prevents path traversal attacks.
  req.file.filename = `${cuid()}-${Date.now()}${ext}`;

  next();
};
```

### Additional Checklist

- [ ] Never serve uploaded files from the same origin as the app (use a CDN/S3)
- [ ] Set `Content-Disposition: attachment` for non-image downloads
- [ ] Set `X-Content-Type-Options: nosniff` header on all file responses
- [ ] Virus scan integration — use ClamAV or a cloud scanning API (e.g., VirusTotal) as a future step
- [ ] Store files with random UUIDs, not user-controlled names

---

## 3. 🟡 OWNER + Channel Access — Edge Case Clarification

> **Current state:** `ROLE_MANAGEMENT_PLAN.md` Section 4 states that
> "Org OWNER and ADMIN can access all channels regardless of `is_private`."
> But it does NOT explicitly address what happens if an OWNER/ADMIN is
> **removed from `ChannelMember`**.

### The Edge Case

```
Scenario:
  - Alice is Org OWNER
  - She is explicitly added to a private channel, then later removed from ChannelMember
  - Does she lose access? NO — she should retain access as OWNER.

Problem:
  - Without a clear rule, a developer might add a ChannelMember check
    that blocks OWNER/ADMIN after removal → inconsistent logic.
```

### The Rule (add this to data access checks)

```ts
// In channel access middleware
async function canAccessChannel(userId: string, channelId: string, orgId: string): Promise<boolean> {
  const orgRole = await getOrgRole(userId, orgId);

  // OWNER and ADMIN NEVER require a ChannelMember record
  // They always have full channel access regardless of membership status
  if (orgRole === 'OWNER' || orgRole === 'ADMIN') return true;

  // All other roles MUST have a ChannelMember record
  const membership = await prisma.channelMember.findUnique({
    where: { channel_id_user_id: { channel_id: channelId, user_id: userId } },
  });

  return membership !== null;
}
```

### Rule Summary

```
Org OWNER / ADMIN:
  ✅ Always can access any channel (public or private)
  ✅ Do NOT require a ChannelMember record
  ✅ Removing them from ChannelMember has NO effect on their access
  → Their access is derived from OrgRole, not ChannelMember table

Org MEMBER / GUEST:
  ❌ MUST have an explicit ChannelMember record
  ❌ No record = no access (403)
  ❌ For private channels, even members need explicit ChannelMember entry
```

> [!IMPORTANT]
> Update the `canAccessChannel()` check in your middleware once you build it.
> This rule must be checked **before** any `ChannelMember` DB query.
> Skipping it = weird access bugs for admins.

---

## 4. 🔴 Database Transaction Rules

> **Why this matters:** Multi-step database operations that are NOT wrapped in a
> transaction can leave the database in a partially-updated state if one step fails.
> For example: removing a member but failing to update the audit log → ghost member.

### Critical Operations — Must Use Transactions

**Pattern:**

```ts
// Always use prisma.$transaction() for multi-step operations
await prisma.$transaction(async (tx) => {
  // All DB calls here are atomic
  // If any throw, ALL are rolled back automatically
});
```

---

#### 4.1 Remove Member (`member.remove`)

```ts
await prisma.$transaction(async (tx) => {
  // Step 1: Remove from OrganizationMember
  await tx.organizationMember.delete({
    where: { org_id_user_id: { org_id: orgId, user_id: targetUserId } },
  });

  // Step 2: Remove from all ChannelMembers in this org
  await tx.channelMember.deleteMany({
    where: {
      user_id: targetUserId,
      channel: { org_id: orgId },
    },
  });

  // Step 3: Write AuditLog
  await tx.auditLog.create({
    data: {
      user_id: actorId,
      action: 'member.remove',
      entity_type: 'Member',
      entity_id: targetUserId,
      metadata: { orgId, targetRole: previousRole },
    },
  });
});
```

---

#### 4.2 Delete Channel (`channel.delete`)

```ts
await prisma.$transaction(async (tx) => {
  // Step 1: Soft-delete all tasks in the channel
  await tx.task.updateMany({
    where: { channel_id: channelId },
    data: { deleted_at: new Date() },
  });

  // Step 2: Soft-delete all messages
  await tx.channelMessage.updateMany({
    where: { channel_id: channelId },
    data: { deleted_at: new Date() },
  });

  // Step 3: Delete the channel itself
  await tx.channel.delete({ where: { id: channelId } });

  // Step 4: Write AuditLog
  await tx.auditLog.create({
    data: {
      user_id: actorId,
      action: 'channel.delete',
      entity_type: 'Channel',
      entity_id: channelId,
      metadata: { orgId, channelName },
    },
  });
});
```

---

#### 4.3 Bulk Task Assignment (`task.assign` — bulk)

```ts
await prisma.$transaction(async (tx) => {
  // Step 1: Upsert TaskAssignment for each user
  await Promise.all(
    userIds.map((userId) =>
      tx.taskAssignment.upsert({
        where: { task_id_user_id: { task_id: taskId, user_id: userId } },
        create: { task_id: taskId, user_id: userId, can_view: true },
        update: {},
      })
    )
  );

  // Step 2: Write AuditLog (single entry with metadata array)
  await tx.auditLog.create({
    data: {
      user_id: actorId,
      action: 'task.assign',
      entity_type: 'Task',
      entity_id: taskId,
      metadata: { assignedUserIds: userIds },
    },
  });
});
```

### Other Operations Requiring Transactions

| Operation | Why |
|-----------|-----|
| `org.delete` | Cascade deletes across channels, members, tasks, settings |
| `org.transfer_ownership` | Role swap between two users must be atomic |
| `channel.create` | Create channel + add creator as MANAGER + write AuditLog |
| Role change (`member.role.change`) | Update role + increment `token_version` + AuditLog |

> [!CAUTION]
> **Never write an AuditLog entry outside a transaction** for operations
> that modify data. If the data write succeeds but the audit log write fails,
> you have untracked changes — which is a compliance issue.

---

## 5. 🟢 System Limits

> **Why this matters:** Without limits, a single org could create 10,000 channels
> or add 50,000 members and degrade performance for everyone. These limits also
> help with billing/plan enforcement in a SaaS context.

### Recommended Limits

```ts
// src/config/systemLimits.ts
export const SYSTEM_LIMITS = {
  MAX_CHANNELS_PER_ORG:       100,   // Increase per plan tier
  MAX_MEMBERS_PER_ORG:        500,   // Increase per plan tier
  MAX_TASKS_PER_CHANNEL:     1000,   // Archiving should free space
  MAX_LABELS_PER_ORG:          50,
  MAX_BOARD_LISTS_PER_CHANNEL: 20,
  MAX_TASK_ATTACHMENTS:        10,
  MAX_CHECKLIST_ITEMS:         50,
  MAX_SUBTASK_DEPTH:            1,   // Subtasks cannot have subtasks. Flat only.
};
```

> [!IMPORTANT]
> **`MAX_SUBTASK_DEPTH = 1` must be enforced at the API level**, not just in config.
> Before creating a task with a `parent_task_id`, check whether the parent is itself a subtask:
> ```ts
> const parent = await prisma.task.findUnique({
>   where: { id: parentTaskId },
>   select: { parent_task_id: true },
> });
> if (parent?.parent_task_id) {
>   return res.status(422).json({
>     error: 'Subtasks cannot have their own subtasks.',
>     code: 'LIMIT_EXCEEDED',
>   });
> }
> ```

### Enforcement Pattern

```ts
// Before creating a new channel
const channelCount = await prisma.channel.count({ where: { org_id: orgId } });
if (channelCount >= SYSTEM_LIMITS.MAX_CHANNELS_PER_ORG) {
  return res.status(422).json({
    error: `Channel limit reached (${SYSTEM_LIMITS.MAX_CHANNELS_PER_ORG} max)`,
    code: 'LIMIT_EXCEEDED',
  });
}
```

### Error Response for Limit Violations

```json
{
  "error": "Channel limit reached (100 max). Archive or delete channels to continue.",
  "code": "LIMIT_EXCEEDED",
  "status": 422,
  "limit": 100,
  "current": 100
}
```

> [!TIP]
> Keep limits in a single `systemLimits.ts` config file.
> Future: load these from DB per org to support plan tiers (Free / Pro / Enterprise).

---

## 6. Subtask Performance Rules

> [!IMPORTANT]
> These rules prevent N+1 query problems in the subtask visibility system.
> Apply before the first load of any board with subtasks.

### 6.1 Index Requirement

```prisma
// tasks.prisma — ADD to Task model
@@index([parent_task_id])   // fast subtask lookup by parent — REQUIRED
```

### 6.2 Accessible Flag — N+1 Safe Query

```ts
// ❌ WRONG — N+1: 1 extra query per subtask
const subtasks = await prisma.task.findMany({ where: { parent_task_id: parentId } });
for (const subtask of subtasks) {
  const assigned = await prisma.taskAssignment.findFirst({
    where: { task_id: subtask.id, user_id: userId },
  });
  subtask.accessible = isAdmin || isOwner || !!assigned;  // N extra queries!
}

// ✅ CORRECT — single query with include
const subtasks = await prisma.task.findMany({
  where: { parent_task_id: parentId },
  orderBy: { position: 'asc' },
  include: {
    assignments: {
      where: { user_id: userId },
      select: { can_view: true },
    },
  },
});

const result = subtasks.map((t) => ({
  ...t,
  accessible: isAdmin || isOwner || t.assignments.length > 0,
}));
```

### 6.3 Direct Subtask Route — Correct Query

```ts
// GET /tasks/:subtaskId — always include parent title
const subtask = await prisma.task.findUnique({
  where: { id: subtaskId },
  include: {
    parent_task: { select: { id: true, title: true } },  // title only
    assignments: { where: { user_id: userId } },
  },
});

if (!subtask)                                                  return res.status(404).json({ error: 'Not found' });
if (!isAdmin && !isOwner && subtask.assignments.length === 0)  return res.status(403).json({ error: 'Forbidden' });

return res.json({
  subtask,
  parent: subtask.parent_task ?? null,   // always present, title only
});
```

---

## Implementation Order (When Ready)


```
1. Database Transaction Rules  → Implement while building controllers
2. Rate Limiting               → Add before first beta deployment
3. File Upload Security        → Add when building attachment feature
4. OWNER Channel Edge Case     → Add when building channel access middleware
5. System Limits               → Add before public launch
6. Subtask Sync Transaction    → Never skip prisma.$transaction() in sync-assignments
7. Subtask Performance Indexes → Add @@index([parent_task_id]) before first board load
```

---

*This file tracks final production hardening items only. Core architecture,
permissions, security, and schema are documented in `ROLE_MANAGEMENT_PLAN.md`.*
