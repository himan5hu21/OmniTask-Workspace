# OmniTask — Role & Permission Reference

> **Reference:** Full design doc → `docs/omnitask_role_management.md` (or brain artifact)
> **Philosophy:** Roles define identity. Capabilities define behavior. Flags define exceptions.
> **Rule:** Never write `if (role === 'ADMIN')`. Always write `if (can('channel.delete'))`.

---

## Role Overview

OmniTask uses a **3-tier permission system**:

| Tier | Scope | Roles |
|------|-------|-------|
| Tier 1 | Organization | `OWNER` · `ADMIN` · `MEMBER` · `GUEST` |
| Tier 2 | Channel | `MANAGER` · `CONTRIBUTOR` · `VIEWER` |
| Tier 3 | Task Assignment | Boolean flags per user per task |

There is also a **platform-level** role:

| Field | Scope | Description |
|-------|-------|-------------|
| `is_superadmin` | Platform (global) | OmniTask platform operator. Can manage any org. Not an org role. |

---

## Permission Resolution Priority

When checking if a user can perform an action, the system resolves in this exact order.
**Top level wins. Stop checking once a match is found.**

```
1.  is_superadmin = true          → ALLOW always
2.  orgRole = OWNER               → ALLOW (critical actions need confirmation body)
3.  Org capability matches action → ALLOW
4.  Channel capability matches    → ALLOW
5.  Task flag matches action      → ALLOW
6.  Fallback                      → DENY (403)
```

---

## Tier 1 — Organization Role Permissions

> Org OWNER and ADMIN **bypass all channel and task level checks automatically**.

| Action / Capability | OWNER | ADMIN | MEMBER | GUEST |
|---------------------|:-----:|:-----:|:------:|:-----:|
| `org.read` — View org details | ✅ | ✅ | ✅ | ✅ |
| `org.update` — Edit org name/avatar | ✅ | ✅ | ❌ | ❌ |
| `org.delete` — Delete org *(needs confirmation)* | ✅ | ❌ | ❌ | ❌ |
| `org.transfer_ownership` *(needs confirmation)* | ✅ | ❌ | ❌ | ❌ |
| `member.invite` — Invite users to org | ✅ | ✅ | settings¹ | ❌ |
| `member.remove` — Remove a member | ✅ | ✅² | ❌ | ❌ |
| `member.role.change` — Promote/demote roles | ✅ | ❌ | ❌ | ❌ |
| `channel.create` — Create a channel | ✅ | ✅ | settings¹ | ❌ |
| `channel.delete` — Delete any channel | ✅ | ✅ | ❌ | ❌ |
| `channel.update` — Edit channel settings | ✅ | ✅ | ❌ | ❌ |
| `channel.view` — See channels | ✅ | ✅ | ✅ | ✅ |
| `label.manage` — Create/edit org labels | ✅ | ✅ | ❌ | ❌ |
| `settings.manage` — Manage org settings | ✅ | ✅ | ❌ | ❌ |
| Leave org | ❌³ | ✅ | ✅ | ✅ |

> ¹ Controlled by `OrganizationSettings.allow_member_create_channel` / `allow_member_invite`
> ² ADMIN cannot remove OWNER
> ³ OWNER cannot leave — must transfer ownership first

---

## Tier 2 — Channel Role Permissions

> These apply to `MEMBER` org-role users only. `OWNER` and `ADMIN` bypass these entirely.

| Action / Capability | MANAGER | CONTRIBUTOR | VIEWER |
|---------------------|:-------:|:-----------:|:------:|
| `message.read` — Read messages | ✅ | ✅ | ✅ |
| `message.send` — Send messages | ✅ | ✅ | ❌ |
| `message.delete.own` — Delete own messages | ✅ | ✅ | ❌ |
| `message.delete.any` — Delete any message | ✅ | ❌ | ❌ |
| `task.view` — View tasks | ✅ | ✅ | ✅ |
| `task.create` — Create tasks | ✅ | ✅ | ❌ |
| `channel.update` — Edit channel name/settings | ✅ | ❌ | ❌ |
| `channel.member.add` — Add members to channel | ✅ | ❌ | ❌ |
| `channel.member.remove` — Remove members | ✅ | ❌ | ❌ |
| `channel.member.promote` — Promote to MANAGER | ✅ | ❌ | ❌ |
| `board.list.create` — Create board columns | ✅ | ❌ | ❌ |
| `board.list.delete` — Delete board columns | ✅ | ❌ | ❌ |
| `board.list.reorder` — Drag/reorder columns | ✅ | ❌ | ❌ |

---

## Tier 3 — Task Assignment Permission Flags

> These are **per-user, per-task boolean flags** stored on `TaskAssignment`.
> Task creator always has full access (unless removed from the channel).
> Org OWNER and ADMIN always bypass these flags.

| Flag | Default | What It Allows |
|------|---------|----------------|
| `can_view` | `true` | See the task, its details, subtasks |
| `can_edit` | `false` | Edit title, description, status, priority, due date, move task |
| `can_check` | `false` | Tick/untick checklist items |
| `can_comment` | `false` | Post comments on the task |

### Task Action Matrix

| Action | Org OWNER/ADMIN | Task Creator | `can_edit = true` | `can_check = true` | `can_comment = true` | `can_view = true` |
|--------|:---------------:|:------------:|:-----------------:|:-----------------:|:--------------------:|:-----------------:|
| View task details | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit title / description | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change status / priority | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change due date | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Move task (drag on board) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add/remove labels | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add attachments | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create subtasks | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add checklist items | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tick checklist items | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Post comments | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit own comment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete own comment | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete any comment | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign users to task | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Remove user assignment | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete task | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Data Visibility Rules

> These control what data is **returned by the API**, not just what actions are permitted.
> These prevent data leaks.

| Resource | Who Can See It |
|----------|---------------|
| Organization data | Must be in `OrganizationMember` |
| Channel list (public) | Any org member |
| Channel content (private) | Only explicit `ChannelMember` + Org OWNER/ADMIN |
| Task | Must be a channel member of the channel the task belongs to |
| Task content (assigned task) | `can_view = true` assignment OR creator OR ADMIN/OWNER |
| Messages | Only channel members |
| Soft-deleted message content | Hidden — returns `{ id, deleted: true }` only |
| Direct message | Only the two participants |

---

## Unassigned Task Fallback

If a task has **no assignments**, behavior depends on `OrganizationSettings.default_task_open_edit`:

| Setting Value | Behavior |
|---------------|----------|
| `true` *(default, recommended)* | Any channel member can view and edit the task |
| `false` *(strict mode)* | Only task creator and org ADMIN/OWNER can edit. Others get view-only. |

---

## OrganizationSettings Flags

These control dynamic capabilities for `MEMBER` role users:

| Setting | Default | Effect When `true` |
|---------|---------|-------------------|
| `allow_member_create_channel` | `true` | MEMBER can create channels |
| `allow_member_invite` | `false` | MEMBER can invite users to org |
| `default_task_open_edit` | `true` | Unassigned tasks are editable by all channel members |

---

## Critical Actions — Extra Confirmation Required

These actions require `{ confirmation: "CONFIRM" }` in the request body **and** always write to `AuditLog`:

| Action | Who Can Do It |
|--------|--------------|
| `org.delete` | OWNER only |
| `org.transfer_ownership` | OWNER only |
| `member.remove` (when target is ADMIN) | OWNER only |

---

## Creator Privilege Scope

The task creator always has implicit full edit access. But:

| Creator CAN | Creator CANNOT |
|-------------|----------------|
| Edit task (title, desc, status, priority) | Override org-level restrictions |
| Assign/unassign users | Act if removed from the channel |
| Delete task | Override if org is deleted |
| Manage task labels | — |

> If a creator is removed from the channel → they lose all access to that task immediately.

---

## Subtask Permissions

> Subtasks are regular `Task` records linked via `parent_task_id`.
> They have their **own independent `TaskAssignment` records** — seeded from the parent
> on creation, then **fully decoupled** — parent changes never auto-sync to subtasks.

### Structural Constraints

| Constraint | Rule |
|-----------|------|
| **Max depth** | `MAX_SUBTASK_DEPTH = 1` — subtasks cannot have their own subtasks. Reject with 422 if `parent_task_id` is itself a subtask. |
| **Ordering** | `position` field (already on `Task` model) — ordered within a parent. Assign `max + 1` on creation. |
| **Cascade delete** | Deleting a parent task cascade-deletes all its subtasks (`onDelete: Cascade` already in schema). Log parent deletion once with subtask IDs in metadata. |

### Assignment Lifecycle

```
1. CREATION (auto-seed)
   When a subtask is created, the system copies all TaskAssignment rows
   from the parent task to the subtask.
   → Same users, same flags (can_view, can_edit, can_check, can_comment)
   → This is the default starting state.

2. OVERRIDE (manual change)
   Authorized users can add/remove assignees on the subtask independently
   of the parent task — the parent's assignments are NOT affected.
   → The subtask and parent then have separate, independent assignment sets.

3. REMOVAL
   Removing an assignee from the subtask only removes them from that subtask.
   They remain assigned to the parent task and sibling subtasks.

4. DRIFT — No Auto-Sync (Default)
   Parent assignment changes DO NOT propagate to subtasks automatically.

   Why — auto-sync is not suitable:
     • Not scalable (1 change × N subtasks = N cascading writes)
     • Not API-safe (bulk ops / automations cannot prompt the user)
     • Breaks intentional per-subtask overrides
     • Creates race conditions under concurrent edits

   Result: If Bob is removed from the parent AFTER subtask creation,
   Bob stays on the subtask’s TaskAssignment until manually changed.

5. OPTIONAL MANUAL SYNC (User-Triggered)
   Two touchpoints — both optional, neither forced:

   a. SUBTASK PANEL BUTTON
      [Sync with parent assignments] button inside the subtask detail view.
      → Full replace: overwrites subtask’s assignments with parent’s current set.
      → Who can trigger: OWNER | ADMIN | Parent Creator | Subtask Creator.

   b. PARENT TASK CONTEXTUAL BANNER (UI only)
      After a parent assignment change, a non-blocking dismissible banner appears:
      "Bob was removed from this task."
      [Apply to all subtasks]   [Ignore]
      → "Apply" syncs parent’s assignments to ALL subtasks at once.
      → "Ignore" = no subtask changes. Shown once per change event.
      → API / bulk ops skip the banner — use POST /tasks/:id/sync-assignments directly.
```

### Who Can Manage Subtask Assignments

| Role | Can Add/Remove/Change Subtask Assignees |
|------|:---------------------------------------:|
| Org OWNER | ✅ Always |
| Org ADMIN | ✅ Always |
| **Parent Task Creator** | ✅ Full control over all its subtasks |
| **Subtask Creator** | ✅ Can manage that specific subtask's assignments |
| `can_edit = true` on subtask | ❌ Cannot — edit flag does not grant assignment control |
| `can_view = true` only | ❌ Cannot |
| Channel CONTRIBUTOR | ❌ Cannot — unless also creator or ADMIN/OWNER |
| Channel VIEWER | ❌ Cannot |

> **Rule:** Only OWNER, ADMIN, the parent task creator, or the subtask's own creator
> can add, remove, or change permission flags on subtask assignees.

### Inheritance Rules

| Rule | Detail |
|------|--------|
| **Visibility** | User sees subtask if they have `can_view = true` on that subtask's own `TaskAssignment` |
| **Parent access → all subtasks** | If user has `can_view` on the parent (or is ADMIN/OWNER) → all subtasks visible |
| **No parent access → filtered** | Only subtasks where user has an explicit `can_view = true` assignment are returned |
| **Editing** | Requires `can_edit` on **that subtask's** `TaskAssignment` OR being its creator OR ADMIN/OWNER |
| **Creating subtasks** | Requires `can_edit` on the parent task OR being the parent's creator OR ADMIN/OWNER |
| **Depth limit** | Cannot create a subtask under a subtask (`MAX_SUBTASK_DEPTH = 1`) |
| **Channel removal** | Losing channel membership → instant loss of access to parent task AND all its subtasks |
| **ADMIN/OWNER** | Always bypass — see and edit any subtask regardless of assignments |

### Edge Case — Assigned to Subtask but NOT Parent

```
Scenario: Bob is on the subtask's assignment (can_view = true)
          but is NOT on the parent task's assignment.

Result:
  → Bob CAN see that specific subtask
  → Bob CAN see the parent task's title and basic info (read-only context)
  → Bob CANNOT edit the parent task
  → Bob CANNOT see sibling subtasks (no assignment on those)
  → Bob CANNOT add new assignees to the subtask (not a creator or ADMIN/OWNER)

API: GET /tasks/:parentId/subtasks
  → Since Bob has no can_view on parent → returns ONLY subtasks where Bob has can_view
  → Sibling subtask data is never leaked
```

### Subtask Action Matrix

| Action | OWNER/ADMIN | Parent Creator | Subtask Creator | `can_edit = true` | `can_view = true` |
|--------|:-----------:|:--------------:|:---------------:|:-----------------:|:-----------------:|
| View subtask list (full — has parent access) | ✅ | ✅ | ✅ | ✅ | ✅ |
| View subtask list (filtered — no parent access) | ✅ | ✅ | ✅ | ✅ | own only |
| Create a subtask | ✅ | ✅ | ❌ | ✅ | ❌ |
| Edit subtask title/desc | ✅ | ✅ | ✅ | ✅ | ❌ |
| Change subtask status/priority | ✅ | ✅ | ✅ | ✅ | ❌ |
| Reorder subtasks (position) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Delete subtask | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Add assignee to subtask** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Remove assignee from subtask** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Change subtask assignment flags** | ✅ | ✅ | ✅ | ❌ | ❌ |

> **Subtask Creator** = user who created that specific subtask.
> **Parent Creator** = user who created the parent task — has authority over ALL its subtasks.
> `can_edit = true` grants editing content only — it never grants assignment management.

---

## Capability Naming Convention

All capabilities follow a strict format. **Never deviate from this.**

```
Format:    resource.action
Rules:     Always lowercase · Dot-separated · No abbreviations

Examples:  org.read  |  channel.delete  |  task.edit  |  message.send  |  member.invite
Invalid:   deleteChannel  |  MSG_SEND  |  channel_update  |  taskEdit
```

---

## AuditLog — Events That Are Always Recorded

> AuditLog is **append-only and immutable** — no `deleted_at`, no `updated_at` on the table.

| Trigger | `action` value | `entity_type` |
|---------|----------------|---------------|
| Member invited | `member.invite` | `Member` |
| Member removed | `member.remove` | `Member` |
| Role changed | `member.role.change` | `Member` |
| Channel deleted | `channel.delete` | `Channel` |
| Channel member added | `channel.member.add` | `Channel` (metadata: targetUserId, channelId) |
| Channel member removed | `channel.member.remove` | `Channel` (metadata: targetUserId, channelId) |
| Task created | `task.create` | `Task` |
| Task updated | `task.update` | `Task` (metadata: changed fields) |
| Task moved (column/status change) | `task.move` | `Task` (metadata: fromListId, toListId) |
| Task deleted | `task.delete` | `Task` |
| Task assigned | `task.assign` | `Task` |
| Org deleted | `org.delete` | `Organization` |
| Org settings updated | `settings.update` | `Organization` |
| Bulk task delete | `task.bulk_delete` | `Task` (metadata: { success[], failed[] }) |
| Subtask created | `subtask.create` | `Task` (metadata: parentTaskId) |
| Subtask assignment sync | `task.assign.sync` | `Task` (metadata: parentTaskId, scope, syncedUserCount) |

> [!NOTE]
> `task.update` and `task.move` are high-frequency. Log them asynchronously (queue-based) to avoid
> slowing down mutation endpoints. All other events in the table are low-frequency and can be logged inline.


---

## Role Escalation Summary

```
is_superadmin
    ↓ bypasses everything
OWNER
    ↓ bypasses channel + task checks
ADMIN
    ↓ bypasses channel + task checks
MEMBER + Channel MANAGER
    ↓ channel capabilities apply
MEMBER + Channel CONTRIBUTOR
    ↓ basic chat + task create only
MEMBER + Channel VIEWER
    ↓ read-only
GUEST
    ↓ org read + channel view only
```

---

*See `ROLE_MANAGEMENT_PLAN.md` for full architecture, schema changes, guard implementation, JWT strategy, and frontend CASL setup.*
