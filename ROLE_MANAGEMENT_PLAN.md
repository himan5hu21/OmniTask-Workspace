# OmniTask — Role Management System (v3 FINAL)

> Evolution: v1 (RBAC) → v2 (Hybrid + Capabilities) → v3 (Production-Ready)
> All gaps from ChatGPT + Gemini review are filled here.

---

## Core Philosophy

```
Roles     → define IDENTITY  (who you are)
Capabilities → define BEHAVIOR  (what you can do)
Flags     → define EXCEPTIONS (task-specific overrides)
```

**Rule: Never write `if (role === 'ADMIN')` anywhere. Always write `if (can('channel.delete'))`.**

---

## 1. Role System (Final)

### 1.1 Organization Roles (`OrgRole`)

| Role | Description |
|------|-------------|
| `OWNER` | Org creator. Full control. Critical actions require confirmation. |
| `ADMIN` | Manages members, channels, labels. Cannot delete org. |
| `MEMBER` | Default. Creates tasks, sends messages. |
| `GUEST` | External collaborator. View-only by default. |

### 1.2 Channel Roles (`ChannelRole`)

| Role | Description |
|------|-------------|
| `MANAGER` | Full channel control — settings, members, board lists. |
| `CONTRIBUTOR` | Can message and create tasks. Cannot manage. |
| `VIEWER` | Read-only access. Cannot post or create tasks. |

> [!CAUTION]
> **Remove `MEMBER` from `ChannelRole` enum entirely.** Do NOT keep it as a legacy alias.
> Since you're still building, write a migration script to rename all existing `MEMBER` channel roles to `CONTRIBUTOR`, then drop the enum value. Keeping it creates confusing branching logic and technical debt.

### 1.3 Task-Level Permission Flags (`TaskAssignment`)

```
can_view    → Can see the task
can_edit    → Can edit title, desc, status, priority, due date
can_check   → Can tick checklist items
can_comment → Can post comments
```

> [!CAUTION]
> **Principle of Least Privilege — All flags default to `false`.**
> The old v2 plan had `@default(true)` on `can_edit`. This is dangerous.
> If the frontend has a bug or the request omits permissions, users get full edit access silently.
> **Only `can_view` defaults to `true`. Everything else must be explicitly granted.**

### 1.4 System Admin (Platform-Level)

Add `is_superadmin Boolean @default(false)` to the `User` model.

This is separate from `OrgRole`. It allows platform operators to manage any org, ban users, or intervene in case of abuse — without being an `OWNER` of any org. Required for an internal admin dashboard later.

---

## 2. Permission Resolution Engine

This is the most important rule. **It defines who wins when roles conflict.**

### Priority Order (Strict — Top Wins)

```
1. is_superadmin = true       → Always allow (platform admin)
2. OWNER (org level)          → Allow all, except critical actions need confirmation
3. Org-level capability match → Allow
4. Channel-level capability match → Allow
5. Task-level flag match      → Allow
6. Fallback                   → DENY (403)
```

### authorize() Flow

```
authorize(action, resource?):
  if user.is_superadmin           → allow
  if orgRole === OWNER            → allow (+ confirm if critical)
  if ORG_CAPABILITIES[orgRole].includes(action) → allow
  if CHANNEL_CAPABILITIES[channelRole].includes(action) → allow
  if resource === 'task' && taskFlag is true → allow
  else → 403
```

> [!IMPORTANT]
> **OWNER/ADMIN Data Layer Bypass — Global Rule (Issue 2 fix)**
> In EVERY channel-scoped API handler, check org role FIRST before any `ChannelMember` query:
> ```ts
> if (orgRole === 'OWNER' || orgRole === 'ADMIN') {
>   // bypass channel membership check entirely — proceed
> } else {
>   // check ChannelMember record
> }
> ```
> This must be applied consistently across ALL endpoints. A missing check in even one endpoint creates a behaviour gap where OWNER is blocked in one route but passes in another.

> Channel role can **expand** org-level access (e.g., a `MEMBER` who is also a channel `MANAGER`
> gains `channel.update` which they wouldn't have at org level alone).
> Org-level always takes precedence — org admins bypass channel restrictions.

---

## 3. Capability System

### 3.1 Naming Convention (STRICT — Never Break This)

```
Format:  resource.action
Rules:
  - Always lowercase
  - Dot-separated only
  - No abbreviations (use 'delete' not 'del', 'message' not 'msg')

Valid:   org.read | channel.delete | task.edit | message.send | member.invite
Invalid: deleteChannel | MSG_SEND | channel_update
```

### 3.2 Org Capability Map

```typescript
export const ORG_CAPABILITIES = {
  OWNER:  ['*'],
  ADMIN:  [
    'org.read', 'org.update',
    'member.invite', 'member.remove', 'member.role.change',
    'channel.create', 'channel.delete', 'channel.update',
    'label.manage', 'settings.manage',
  ],
  MEMBER: [
    'org.read', 'channel.view',
    'task.create', 'task.comment',
    // 'channel.create' added dynamically if OrganizationSettings.allow_member_create_channel = true
    // 'member.invite' added dynamically if OrganizationSettings.allow_member_invite = true
  ],
  GUEST:  ['org.read', 'channel.view'],
};
```

### 3.3 Channel Capability Map

```typescript
export const CHANNEL_CAPABILITIES = {
  MANAGER: [
    'channel.update', 'channel.member.add', 'channel.member.remove',
    'channel.member.promote', 'board.list.create', 'board.list.delete',
    'board.list.reorder', 'message.delete.any', 'message.send',
    'task.create', 'message.delete.own',
  ],
  CONTRIBUTOR: [
    'message.send', 'task.create', 'message.delete.own',
  ],
  VIEWER: [
    'message.read', 'task.view',
  ],
};
```

---

## 4. Data Access Rules (Visibility — Prevents Data Leaks)

> [!IMPORTANT]
> This is separate from action permissions. These rules control what data is **returned** by the API,
> not just what actions are allowed.

### Organization Data

- User **must** be in `OrganizationMember` to access any org data.
- If not a member → `403 Forbidden` immediately. Never return org data.

### Channel Data

- User **must** be in `ChannelMember` to access channel data.
- If `channel.is_private = true` → only explicit `ChannelMember` records can access. No exceptions (even org `MEMBER` can't see it unless added).
- Org `OWNER` and `ADMIN` can access all channels regardless of `is_private`.

### Task Data

- User must be a `ChannelMember` of the channel the task belongs to.
- Task must not be soft-deleted (`deleted_at = null`).
- If task has `TaskAssignment` records, the user's `can_view` flag must be `true`.
- If task has **no assignments** → fallback to `OrganizationSettings.default_task_open_edit`.

### Message Data

- Visible only to `ChannelMember` records of that channel.
- Soft-deleted messages (`deleted_at != null`) return as `{ id, deleted: true }` — never expose content.

### Non-Member Access Rule

```
If user not in OrganizationMember  → 403, stop
If user not in ChannelMember       → 403, stop
If channel.is_private && not member → 403, stop
```

Never allow "public" access until a feature flag explicitly enables it.

---

## 5. Special Rules

### 5.1 Creator Privileges (Scoped)

```
Task Creator CAN:
  - edit task (always, regardless of TaskAssignment flags)
  - assign/unassign users
  - delete task
  - manage task labels

Task Creator CANNOT override:
  - org-level restrictions (e.g., if org is deleted)
  - channel-level restrictions (e.g., if removed from channel)
  → If creator is removed from channel, they lose all task access
```

### 5.2 Unassigned Task Behavior

Controlled by `OrganizationSettings.default_task_open_edit`.

**Virtual Assignment Model (Issue 3 fix — keeps system consistent):**
```
Instead of treating "no assignment" as a special case that bypasses the flag system,
apply a virtual assignment so the flag system stays the single source of truth:

IF task has NO TaskAssignment records:
  Treat as if the user has:
    can_view:    true                         (always)
    can_edit:    settings.default_task_open_edit  (org-controlled)
    can_check:   settings.default_task_open_edit
    can_comment: settings.default_task_open_edit

This means the authorize() unassigned check becomes:
  if (!assignment) {
    const settings = await getOrgSettings(orgId);
    const virtualFlags = {
      can_view:    true,
      can_edit:    settings.default_task_open_edit,
      can_check:   settings.default_task_open_edit,
      can_comment: settings.default_task_open_edit,
    };
    const flag = flagMap[action];
    if (flag && virtualFlags[flag]) return next();
  }

Why this is better:
  ✔ Consistent — same flag system applies everywhere
  ✔ No special-case branching ("no assignment = edit") that confuses mental models
  ✔ Easily extensible (add more flags without rethinking the unassigned case)
```

### 5.3 Critical Actions (Require Confirmation)

These require `{ confirmation: "CONFIRM" }` in the request body **AND** always write to `AuditLog`:

```
org.delete
org.transfer_ownership
member.remove (when target is ADMIN)
```

### 5.4 Bulk Actions

```
- Validate permission for EACH ITEM INDIVIDUALLY in a loop (Issue 5 fix)
- Strategy: PARTIAL SUCCESS with report
  → Return { success: [...ids], failed: [...ids] }
- Never silently skip failures
- Require same permission as the equivalent single action
- Log bulk operations in AuditLog with metadata array
```

**Bulk authorization pattern (non-negotiable):**
```ts
// src/controllers/tasks.controller.ts — bulk delete example
const success: string[] = [];
const failed:  string[] = [];

for (const taskId of taskIds) {
  const permitted = await canUserActOnTask(userId, taskId, 'task.delete', orgRole);
  if (!permitted) {
    failed.push(taskId);
    continue;
  }
  success.push(taskId);
}

// Only execute DB deletions for items in success[]
await prisma.task.deleteMany({ where: { id: { in: success } } });

// AuditLog: log once with both arrays
await prisma.auditLog.create({
  data: { action: 'task.bulk_delete', metadata: { success, failed } }
});

return res.json({ success, failed });
// ❌ Never: delete all then report — unauthorized items must never reach deleteMany
```

### 5.5 Subtask Permissions

> Subtasks are regular `Task` records linked via `parent_task_id`.
> They have their **own independent `TaskAssignment` records**.
> On creation, those records are **seeded (copied) from the parent task's assignments**.
> After creation, the subtask's assignments are **fully decoupled** from the parent.

#### Structural Constraints

```
MAX_SUBTASK_DEPTH = 1
  → A task can have subtasks.
  → A subtask CANNOT have further subtasks (no nested subtasks).
  → Enforce on creation: if parent_task_id is already a subtask → reject with 422.

position field
  → Task model already has position: Int @default(0).
  → Subtasks within a parent are ordered by position.
  → On creation, assign position = (current max + 1) within that parent.

Cascade delete
  → parent_task Task? @relation("SubTasks", onDelete: Cascade) — already in schema.
  → Deleting a parent task automatically deletes all its subtasks.
  → AuditLog: log parent deletion once with metadata listing subtask IDs.
```

**Assignment Lifecycle:**
```
1. CREATION (auto-seed)
   When a subtask is created, copy all TaskAssignment rows from the parent:
     await prisma.$transaction(async (tx) => {
       const parentAssignments = await tx.taskAssignment.findMany({
         where: { task_id: parentTaskId },
       });
       await tx.taskAssignment.createMany({
         data: parentAssignments.map((a) => ({
           task_id: newSubtaskId,
           user_id: a.user_id,
           can_view:    a.can_view,
           can_edit:    a.can_edit,
           can_check:   a.can_check,
           can_comment: a.can_comment,
         })),
         skipDuplicates: true,
       });
     });

2. OVERRIDE
   Authorized users can add/remove/change assignees on the subtask independently.
   The parent task's assignments are NOT affected by subtask assignment changes.

3. REMOVAL
   Removing an assignee from the subtask ONLY affects that subtask.
   They stay assigned on the parent and any sibling subtasks.
```

**Drift Rule — No Auto-Sync (Default):**
```
Parent task assignment changes DO NOT automatically propagate to subtasks.

Why — auto-sync is NOT suitable because:
  • Not scalable: 1 parent change × 12 subtasks = 12 cascading writes
  • Not API-safe: bulk ops and automations cannot prompt the user
  • Breaks overrides: intentional per-subtask permission changes get wiped
  • Race conditions: concurrent edits create unpredictable state

Result:
  → Bob removed from parent AFTER subtask was created → Bob stays on subtask.
  → Authorized user can manually manage it, or use the sync action below.
  → Drift is visible in the UI (subtask assignments shown separately).
```

**Optional Manual Sync (User-Triggered):**
```
Two sync touchpoints — both optional, neither forced:

  1. SUBTASK PANEL BUTTON
     Inside the subtask detail view:
     [Sync with parent assignments]
     → Replaces this subtask's assignments with the parent's current assignment set.
     → Overwrites all existing subtask assignments (full replace, not merge).
     → Requires: OWNER | ADMIN | Parent Creator | Subtask Creator.

  2. PARENT TASK CONTEXTUAL BANNER
     After a parent assignment change, show a one-time non-blocking banner:
     "Bob was removed from this task."
     [Apply to all subtasks]   [Ignore]
     → "Apply" = sync parent’s current assignments to ALL subtasks at once.
     → "Ignore" = dismiss, no changes to subtasks.
     → Not a blocking modal — dismissible, shown once per change event.
     → Works only in UI. API/bulk ops use the sync endpoint directly.
```

**Sync API — POST /tasks/:taskId/sync-assignments:**
```ts
// Who can call this:
//   OWNER, ADMIN, Parent Task Creator, Subtask Creator
//   (same rule as managing subtask assignments)

// Request body:
{
  scope: 'this'   // sync only this subtask from its parent
         | 'all'  // sync ALL subtasks of this parent task
}

// Behavior (always a transaction):
await prisma.$transaction(async (tx) => {
  const parentAssignments = await tx.taskAssignment.findMany({
    where: { task_id: parentTaskId },
  });

  // Full replace: delete existing, re-seed from parent
  await tx.taskAssignment.deleteMany({ where: { task_id: subtaskId } });
  await tx.taskAssignment.createMany({
    data: parentAssignments.map((a) => ({
      task_id: subtaskId,
      user_id: a.user_id,
      can_view:    a.can_view,
      can_edit:    a.can_edit,
      can_check:   a.can_check,
      can_comment: a.can_comment,
    })),
  });

  await tx.auditLog.create({
    data: {
      user_id: actorId,
      action: 'task.assign.sync',
      entity_type: 'Task',
      entity_id: subtaskId,
      metadata: { parentTaskId, scope, syncedUserCount: parentAssignments.length },
    },
  });
});

// Response:
{ success: true, synced: N }   // N = number of assignments written
```

> [!IMPORTANT]
> Sync is a **full replace**, not a merge.
> After sync, the subtask's assignments exactly mirror the parent's at that moment.
> Any previous per-subtask overrides are lost — this is intentional and expected.
> AuditLog entry is always written.

**Who Can Manage Subtask Assignments:**
```
✅  Org OWNER           → Always
✅  Org ADMIN           → Always
✅  Parent Task Creator → Full control over all its subtasks' assignments
✅  Subtask Creator     → Can manage that specific subtask's assignments only
❌  can_edit = true     → Grants content editing ONLY. Does NOT grant assignment control.
❌  can_view = true     → Cannot manage assignments
❌  Channel CONTRIBUTOR → Cannot — unless also a creator or ADMIN/OWNER
❌  Channel VIEWER      → Cannot
```

**Core Access Rules:**
```
1. VISIBILITY
   Seeded can_view on subtask = inherited from parent by default.
   User sees subtask if they have can_view on that subtask's TaskAssignment.

2. EDITING SUBTASK CONTENT
   Requires can_edit on the subtask's own TaskAssignment
   OR being the subtask's creator OR ADMIN/OWNER.

3. CREATING A SUBTASK
   Requires can_edit on the PARENT task OR being the parent's creator OR ADMIN/OWNER.
   CONTRIBUTOR channel role alone is NOT sufficient.
   MAX_SUBTASK_DEPTH check must run before creation — reject if parent is already a subtask.

4. CHANNEL REMOVAL
   Losing channel membership → instant loss of access to parent + all its subtasks.

5. SIBLING ISOLATION
   Assigned to a subtask but NOT the parent:
     → Can see that subtask + parent title (read-only context only)
     → CANNOT see sibling subtasks (no assignment on those)
     → CANNOT add new assignees (not a creator or ADMIN/OWNER)
```

**Subtask Listing API Rule (GET /tasks/:parentId/subtasks):**
```
IF user has can_view on the parent task (or is ADMIN/OWNER):
  → Return ALL subtasks of that parent

ELSE (user has no parent task access):
  → Return ONLY subtasks where user has an explicit can_view = true
    in that subtask's own TaskAssignment
  → Never expose sibling subtask content without explicit assignment

Why this matters:
  Without this rule, an API returning all subtasks to anyone who knows the parentId
  leaks task data to users who only have a partial assignment.
```

**Frontend rendering for restricted subtasks:**
```
RULE: Frontend MUST NOT guess accessibility from assignment presence.
      Frontend MUST rely entirely on the `accessible` boolean returned by the API.

Backend formula (computed per subtask per requesting user):
  accessible = isOrgAdmin || isOrgOwner || isAssignedToSubtask

  where:
    isAssignedToSubtask = TaskAssignment exists for (subtask.id, user.id)
    isOrgAdmin / isOrgOwner = user's OrgRole in [ADMIN, OWNER]

API response shape (per subtask item):
  {
    id:          string
    title:       string
    status:      TaskStatus
    priority:    Priority
    position:    number
    assignees:   [...]
    accessible:  boolean   // ← computed, not derived by frontend
  }

UI rendering:
  accessible: true  → Normal clickable mini card
  accessible: false → Locked mini card:
                        [🔒 icon] + title (dimmed #4A4F6A)
                        Click shows toast: "You don't have access to this subtask"
                        (does NOT navigate, does NOT open drawer)

This avoids two bad alternatives:
  ❌ Hiding inaccessible subtasks → parent view looks incomplete
  ❌ Frontend guessing from assignment → ADMIN/OWNER get incorrectly locked cards

Edge case — ADMIN/OWNER:
  Has parent access → all subtasks returned
  Not in TaskAssignment for a subtask → accessible = true (ADMIN/OWNER bypass)
  Frontend sees accessible: true → normal card shown ✔
  (Without the flag, frontend would wrongly show 🔒)
```

**Direct Subtask Route (assigned-only user entry):**
```
Scenario:
  User has can_view on a subtask's own TaskAssignment
  BUT has no can_view on the parent task
  → Cannot navigate to parent page normally
  → Must be able to open the subtask directly

Route: GET /tasks/:subtaskId  (direct, no parent context required)
  → If user is in subtask's TaskAssignment (or is ADMIN/OWNER):
      Return subtask detail
      Include parent: { id, title } (read-only title only — no full parent data)
  → If user has NO subtask assignment:
      Return 403

Frontend URL: /org/:orgId/task/:subtaskId  (no channel in path)
  → Renders Task Detail drawer/page directly
  → Breadcrumb: [Parent Task Title (read-only)] → [Subtask Title]
  → "[Parent Task Title]" is NOT clickable if user has no parent access
  → "[Parent Task Title]" IS clickable if user also has parent can_view
```


**Final Implementation Rules (non-negotiable):**
```
1. ACCESSIBLE FLAG
   → MUST be computed on backend per request, never derived by frontend
   → Formula: accessible = isOrgAdmin || isOrgOwner || isAssignedToSubtask
   → Included in every subtask list response item
   → Frontend treats it as the single source of truth for lock/unlock

2. DIRECT SUBTASK API RESPONSE
   Route: GET /tasks/:subtaskId
   Response shape (always):
   {
     subtask: { id, title, status, priority, position, description, ... },
     parent:  { id, title }   // title only — never full parent data for non-parent users
   }

3. SYNC ACTION TRANSACTION
   → POST /tasks/:taskId/sync-assignments MUST always use prisma.$transaction()
   → Never skip it — a partial sync (some deleted, some not created) is worse than none

4. PERFORMANCE (N+1 prevention)
   → Use single findMany with include to compute accessible in one DB round-trip
   → Never loop + findUnique to check per-subtask assignment
   → See PRODUCTION_HARDENING.md Section 6 for full optimized query examples
```

**Subtask Action Matrix:**

| Action | OWNER/ADMIN | Parent Creator | Subtask Creator | `can_edit = true` | `can_view = true` |
|--------|:-----------:|:--------------:|:---------------:|:-----------------:|:-----------------:|
| View subtask list (full) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View subtask list (filtered) | ✅ | ✅ | ✅ | ✅ | own only |
| Create a subtask | ✅ | ✅ | ❌ | ✅ | ❌ |
| Edit subtask content | ✅ | ✅ | ✅ | ✅ | ❌ |
| Change subtask status | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete subtask | ✅ | ✅ | ✅ | ❌ | ❌ |
| Add assignee to subtask | ✅ | ✅ | ✅ | ❌ | ❌ |
| Remove assignee from subtask | ✅ | ✅ | ✅ | ❌ | ❌ |
| Change subtask assignment flags | ✅ | ✅ | ✅ | ❌ | ❌ |
| Reorder subtasks (position) | ✅ | ✅ | ✅ | ✅ | ❌ |

> **Parent Creator** has authority over ALL subtask assignments under their task.
> `can_edit` flag controls content edits only — never assignment management.
> **No auto-sync** — use `POST /tasks/:id/sync-assignments` to explicitly align subtask assignments with the parent.


---


## 6. Schema Changes (Final — v3)

### 6.1 `base.prisma` — Enums & Models

```prisma
enum OrgRole {
  OWNER
  ADMIN
  MEMBER
  GUEST
}

enum ChannelRole {
  MANAGER
  CONTRIBUTOR  // replaces MEMBER
  VIEWER
  // MEMBER is removed — migrate existing records to CONTRIBUTOR first
}
```

```prisma
model User {
  // ... existing fields ...
  is_superadmin Boolean @default(false)   // ← ADD: platform admin
  token_version Int     @default(0)       // ← ADD: for JWT invalidation
}
```

```prisma
model Channel {
  // ... existing fields ...
  is_private Boolean @default(false)  // ← ADD
}
```

```prisma
model OrganizationMember {
  // ... existing fields ...
  role_updated_at DateTime @default(now())  // ← ADD: for JWT revocation check
}
```

```prisma
model Organization {
  // ... existing fields ...
  settings OrganizationSettings?  // ← ADD relation
}
```

### 6.2 `tasks.prisma` — TaskAssignment (Fixed)

```prisma
model TaskAssignment {
  id      String @id @default(cuid())
  task_id String
  user_id String

  // LEAST PRIVILEGE: all false except can_view
  can_view    Boolean @default(true)   // ← only this is true by default
  can_edit    Boolean @default(false)  // ← must be explicitly granted
  can_check   Boolean @default(false)  // ← must be explicitly granted
  can_comment Boolean @default(false)  // ← must be explicitly granted

  task Task @relation(fields: [task_id], references: [id], onDelete: Cascade)
  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  created_at DateTime @default(now())

  @@unique([task_id, user_id])
  @@index([task_id])
  @@index([user_id])
  @@map("task_assignments")
}

// DELETE the TaskPermission enum — replaced by boolean flags above
```

### 6.3 New Models

```prisma
model OrganizationSettings {
  id                          String  @id @default(cuid())
  org_id                      String  @unique
  allow_member_create_channel Boolean @default(true)
  allow_member_invite         Boolean @default(false)
  default_task_open_edit      Boolean @default(true)

  organization Organization @relation(fields: [org_id], references: [id], onDelete: Cascade)

  @@map("organization_settings")
}

// AuditLog — IMMUTABLE. No deleted_at. No updated_at. Append-only.
model AuditLog {
  id          String   @id @default(cuid())
  user_id     String
  action      String   // e.g. "member.remove", "channel.delete"
  entity_type String   // "Organization" | "Channel" | "Task" | "Member"
  entity_id   String
  metadata    Json?    // { targetUserId, previousRole, newRole, etc. }
  created_at  DateTime @default(now())

  user User @relation(fields: [user_id], references: [id])

  @@index([user_id])
  @@index([entity_type, entity_id])
  @@map("audit_logs")
}
```

> [!CAUTION]
> **AuditLog must be strictly immutable.**
> - No `deleted_at` column (never soft-delete logs)
> - No `updated_at` column (never edit logs)
> - No application-level delete route for audit logs
> - This is required for security compliance

---

## 7. JWT Strategy & Token Invalidation

### 7.1 JWT Payload

```typescript
{
  userId: string,
  tokenVersion: number,        // matches User.token_version in DB
  is_superadmin: boolean,
  orgRoles: {
    [org_id: string]: OrgRole  // e.g. { 'org_abc': 'ADMIN' }
  },
  iat: number,                 // issued-at timestamp (auto by JWT)
  exp: number                  // 15 minutes
}
```

### 7.2 Token Rules

```
Access Token  → 15 min TTL, signed, contains orgRoles
Refresh Token → long-lived (7–30 days), stored in HttpOnly cookie
```

### 7.3 Token Invalidation (Two-Layer Strategy)

**Layer 1 — `token_version` (Immediate Role Revocation)**

When a user's role changes:
```typescript
await prisma.user.update({
  where: { id: userId },
  data: { token_version: { increment: 1 } }
});
```

In every request, the middleware checks:
```typescript
const dbUser = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { token_version: true } });
if (req.user.tokenVersion !== dbUser.token_version) {
  return res.status(401).json({ code: 'TOKEN_REVOKED' });
}
```

**Layer 2 — `role_updated_at` (Lightweight Role Freshness Check)**

For channel roles (not in JWT), compare JWT `iat` against `OrganizationMember.role_updated_at`:
```typescript
// If JWT was issued BEFORE the role was updated → force token refresh
if (new Date(req.user.iat * 1000) < membership.role_updated_at) {
  return res.status(401).json({ code: 'ROLES_STALE' });
}
```

> This avoids Redis for simple role changes while still guaranteeing correct permissions.

---

## 8. Channel Role Caching (Redis)

```
Storage key:  channel_role:{userId}:{channelId}   ← PER-CHANNEL key (Issue 6 fix)
Value:        'MANAGER' | 'CONTRIBUTOR' | 'VIEWER'
TTL:          10 minutes

Why NOT channel_roles:{userId} (all channels in one key):
  ❌ If user is in 1000 channels, one key becomes huge
  ❌ Cannot invalidate a single channel's role without clearing ALL of them
  ❌ Partial invalidation is impossible

Why channel_role:{userId}:{channelId} (per-channel key):
  ✔ Granular: role change in channel X only invalidates that key
  ✔ Scales linearly (small keys, large volume)
  ✔ No memory spike from a single super-member

Invalidate (delete specific key) on:
  - ChannelMember.role updated for (userId, channelId)  → delete channel_role:{userId}:{channelId}
  - User added to channel                               → delete channel_role:{userId}:{channelId}
  - User removed from channel                           → delete channel_role:{userId}:{channelId}

Fetch strategy:
  1. Check Redis: GET channel_role:{userId}:{channelId}
  2. If miss → query DB → SET channel_role:{userId}:{channelId} EX 600
  3. Never query DB twice for same (userId, channelId) in same request
```

---

## 9. Backend — authorize() (Final Implementation)

```typescript
// src/middlewares/authorize.ts
export const authorize = (action: string, resource?: 'task') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { userId, orgRoles, is_superadmin, tokenVersion } = req.user;

    // 1. Platform admin bypass
    if (is_superadmin) return next();

    // 2. Validate token_version (catch revoked tokens)
    const dbUser = await getFromCacheOrDB('user', userId, () =>
      prisma.user.findUnique({ where: { id: userId }, select: { token_version: true } })
    );
    if (tokenVersion !== dbUser.token_version) {
      return res.status(401).json({ code: 'TOKEN_REVOKED', error: 'Session expired' });
    }

    const orgId = req.params.org_id ?? req.body.org_id;
    const orgRole = orgRoles?.[orgId] ?? 'MEMBER';

    // 3. OWNER bypass (with confirmation guard for critical actions)
    if (orgRole === 'OWNER') return next();

    // 4. Org capability check (dynamic: check OrganizationSettings too)
    const orgPerms = getOrgCapabilities(orgRole, await getOrgSettings(orgId));
    if (orgPerms.includes(action)) return next();

    // 5. Channel capability check
    const channelId = req.params.channel_id ?? req.body.channel_id;
    if (channelId) {
      const channelRole = await getChannelRole(userId, channelId); // Redis first
      const channelPerms = CHANNEL_CAPABILITIES[channelRole] ?? [];
      if (channelPerms.includes(action)) return next();
    }

    // 6. Task flag check
    if (resource === 'task') {
      const taskId = req.params.task_id;
      const [task, assignment] = await Promise.all([
        prisma.task.findUnique({ where: { id: taskId }, select: { creator_id: true } }),
        prisma.taskAssignment.findUnique({
          where: { task_id_user_id: { task_id: taskId, user_id: userId } }
        })
      ]);

      // Creator override (scoped — ONLY if still a channel member) (Issue 1 fix)
      const isChannelMember = channelId
        ? await prisma.channelMember.findUnique({
            where: { channel_id_user_id: { channel_id: channelId, user_id: userId } },
            select: { id: true },
          })
        : null;
      if (task?.creator_id === userId && isChannelMember) return next();
      // If creator was removed from channel → falls through to flag check → denied

      const flagMap: Record<string, keyof NonNullable<typeof assignment>> = {
        'task.view':    'can_view',
        'task.edit':    'can_edit',
        'task.check':   'can_check',
        'task.comment': 'can_comment',
      };
      const flag = flagMap[action];
      if (assignment && flag && assignment[flag] === true) return next();

      // Unassigned task — virtual assignment model (Issue 3 fix)
      if (!assignment) {
        const settings = await getOrgSettings(orgId);
        const virtualFlags: Record<string, boolean> = {
          can_view:    true,
          can_edit:    settings.default_task_open_edit,
          can_check:   settings.default_task_open_edit,
          can_comment: settings.default_task_open_edit,
        };
        const flag = flagMap[action] as string;
        if (flag && virtualFlags[flag]) return next();
      }
    }

    // 7. Default deny
    return res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN' });
  };
};
```

**Performance rules inside authorize():**
- `getFromCacheOrDB()` — wraps Redis check before any Prisma call
- `Promise.all()` for parallel DB calls (task + assignment fetched together)
- Request context cache: attach fetched data to `req._cache` to avoid duplicate queries in the same request lifecycle

---

## 10. Frontend — CASL + Silent Token Refresh

### 10.1 CASL Setup

```typescript
// src/lib/ability.ts
export function buildAbility(orgRole: OrgRole, channelRole: ChannelRole, taskFlags?: TaskFlags, isSuperAdmin = false) {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  if (isSuperAdmin) { can('manage', 'all'); return build(); }

  if (orgRole === 'OWNER') { can('manage', 'all'); }
  else if (orgRole === 'ADMIN') {
    can(['update', 'manage'], 'Organization');
    can('manage', 'Member');
    can(['create', 'delete', 'update'], 'Channel');
    can('manage', 'Label');
  } else if (orgRole === 'MEMBER') {
    can('read', 'Organization');
    can('read', 'Channel');
    can('create', 'Task');
    can('comment', 'Task');
  } else if (orgRole === 'GUEST') {
    can('read', 'Organization');
    can('read', 'Channel');
  }

  if (channelRole === 'MANAGER') {
    can('manage', 'Channel');
    can('manage', 'BoardList');
    can('delete', 'Message');
  } else if (channelRole === 'CONTRIBUTOR') {
    can('send', 'Message');
    can('create', 'Task');
  } else if (channelRole === 'VIEWER') {
    can('read', 'Message');
    can('read', 'Task');
  }

  if (taskFlags?.can_edit)    can('edit', 'Task');
  if (taskFlags?.can_check)   can('check', 'Task');
  if (taskFlags?.can_comment) can('comment', 'Task');
  if (taskFlags?.can_view)    can('read', 'Task');

  return build();
}
```

### 10.2 Silent Token Refresh (Axios Interceptors)

```typescript
// src/lib/axiosInstance.ts
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const code = error.response.data?.code;

      // TOKEN_REVOKED = role changed → refresh token to get new JWT
      // ROLES_STALE   = channel role changed → same fix
      if (code === 'TOKEN_REVOKED' || code === 'ROLES_STALE') {
        try {
          await axios.post('/auth/refresh'); // refresh HttpOnly cookie → new access token
          return axiosInstance(original);   // retry original request
        } catch {
          store.dispatch(logout()); // refresh also failed → force re-login
        }
      }
    }
    return Promise.reject(error);
  }
);
```

> This means: when role changes, next API call gets a 401 → Axios silently refreshes token in background → retries original request → user sees nothing. Seamless.

### 10.3 Context Rebuild on Org/Channel Switch

```tsx
// Rebuild CASL ability whenever context changes
export function AbilityProvider({ children }) {
  const { orgRole, channelRole, taskFlags, isSuperAdmin } = useCurrentContext();
  const ability = useMemo(
    () => buildAbility(orgRole, channelRole, taskFlags, isSuperAdmin),
    [orgRole, channelRole, taskFlags, isSuperAdmin]
  );
  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
}
```

---

## 11. Error Response Standard

```json
{
  "error": "Permission denied",
  "code": "FORBIDDEN",
  "status": 403
}
```

Standard codes:
```
FORBIDDEN       → 403, no permission
TOKEN_REVOKED   → 401, token_version mismatch
ROLES_STALE     → 401, role changed after token issued
NOT_FOUND       → 404
VALIDATION_ERROR → 400
```

---

## 12. Audit Log — Events to Record

> Remember: AuditLog is **immutable** — no updates, no soft deletes.

| Trigger | `action` | `entity_type` |
|---------|----------|---------------|
| Member invited | `member.invite` | `Member` |
| Member removed | `member.remove` | `Member` |
| Role changed | `member.role.change` | `Member` |
| Channel deleted | `channel.delete` | `Channel` |
| Task deleted | `task.delete` | `Task` |
| Task assigned | `task.assign` | `Task` |
| Org deleted | `org.delete` | `Organization` |
| Org settings changed | `settings.update` | `Organization` |
| Bulk task delete | `task.bulk_delete` | `Task` (metadata: array of ids) |

---

## 13. Soft Delete Rules

```
- Always filter: WHERE deleted_at IS NULL in all queries
- Soft-deleted records → treated as non-existent for all permission checks
- No actions allowed on soft-deleted entities → 404 (not 403)
- AuditLog still stores the action even for deleted entity targets
- ChannelMessage soft delete → return { id, deleted: true } to clients (hide content)
```

---

## 14. Implementation Order

```
Phase 1 — Schema & Migration
  1. Add is_superadmin, token_version to User
  2. Add role_updated_at to OrganizationMember
  3. Add is_private to Channel
  4. Migrate ChannelMember.role: MEMBER → CONTRIBUTOR
  5. Remove MEMBER from ChannelRole enum
  6. Update TaskAssignment: replace TaskPermission enum with 4 boolean flags (all false except can_view)
  7. Delete TaskPermission enum
  8. Add OrganizationSettings model
  9. Add AuditLog model (no deleted_at, no updated_at)
  10. Run prisma migrate

Phase 2 — Backend
  1. Create src/config/permissions.ts (capability maps + naming)
  2. Build unified authorize() middleware
  3. Add token_version validation in auth middleware
  4. Add role_updated_at check for channel roles
  5. Set up Redis for channel role caching
  6. Apply authorize() to all routes
  7. Build AuditLog service (append-only write)
  8. Add critical action confirmation middleware
  9. Add getOrgSettings() with caching

Phase 3 — Frontend
  1. Install @casl/ability @casl/react
  2. Build buildAbility() factory
  3. Create AbilityContext + AbilityProvider
  4. Set up Axios interceptors for silent token refresh (401 handling)
  5. Store orgRoles in decoded JWT state; fetch channelRole per channel
  6. Replace all boolean flag checks with <Can I="" a=""> wrappers
  7. Rebuild ability on org/channel switch
  8. Handle GUEST restricted UI
```

---

## 15. Future Extensibility

```
- Custom org-level roles (Phase 2+): stored in DB, not enum
- Dynamic capability assignment per role per org
- Bot/integration accounts: special OrgRole or is_bot flag
- Feature flags: enable/disable capabilities per org via OrganizationSettings
- Public channels: is_private = false allows read without ChannelMember record
- Webhook permissions: separate permission scope
```

---

## 16. Complete Schema Change Checklist

| Change | File | Status |
|--------|------|--------|
| Add `is_superadmin`, `token_version` to `User` | `base.prisma` | ❌ TODO |
| Add `GUEST` to `OrgRole` | `base.prisma` | ❌ TODO |
| Remove `MEMBER`, add `CONTRIBUTOR`+`VIEWER` to `ChannelRole` | `base.prisma` | ❌ TODO |
| Add `is_private` to `Channel` | `base.prisma` | ❌ TODO |
| Add `role_updated_at` to `OrganizationMember` | `base.prisma` | ❌ TODO |
| Replace `TaskPermission` enum with 4 boolean flags on `TaskAssignment` | `tasks.prisma` | ❌ TODO |
| Delete `TaskPermission` enum | `tasks.prisma` | ❌ TODO |
| Add `OrganizationSettings` model | `base.prisma` | ❌ TODO |
| Add `AuditLog` model (immutable — no deleted_at/updated_at) | new file | ❌ TODO |
| Migrate existing `ChannelMember.role = MEMBER` → `CONTRIBUTOR` | migration SQL | ❌ TODO |
