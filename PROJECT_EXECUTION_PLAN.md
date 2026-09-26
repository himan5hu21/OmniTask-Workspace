# OmniTask Project Execution Plan

## 1. Project Summary

You want to build a team collaboration platform where:

- A user can create an organization.
- Each organization can have multiple channels like `ERP`, `HRMS`, `Accounts`, `Engineering`.
- Members can chat inside channels.
- Members can also chat personally using direct messages.
- Tasks can be created from chat or from a dedicated tasks area.
- Tasks support deep hierarchy:
  - Main task
  - Subtask
  - Subtask of subtask
- Tasks can be assigned to specific users.
- Users should be able to view:
  - A single task in detail
  - All tasks of a channel
  - Tasks related to chat

This product is essentially a combination of:

- Slack / Microsoft Teams for communication
- ClickUp / Asana / Linear for task management
- Notion-style nested task structure

## 2. Current Status In Your Existing Codebase

The platform is structured with `frontend` (Next.js 16), `backend` (Fastify), and `shared` logic with full end-to-end integration:

### Backend Implementation
- **Authentication**: JWT auth, Argon2/bcrypt password hashing, refresh token rotation via Prisma, user profile endpoints.
- **Multi-tenancy & Organizations**: Full CRUD, member invites, role management, cascade operations.
- **Channels**: CRUD, channel membership, role promotion/demotion.
- **Real-time Messaging**: Socket.IO authenticated rooms, channel chat, direct messaging (1-on-1), message deletion, unread counters, pagination.
- **Task Management**: Kanban boards, lists, subtask tree, assignees, priorities, due dates, task activity logs, chat-to-task integration.
- **Notifications**: In-app notifications for task assignments, mentions, and DMs.
- **Storage**: Cloudinary file attachment uploads with streaming support and MIME detection.
- **Permissions**: Hybrid Tier-1 (Org) & Tier-2 (Channel) RBAC matrix via `shared/permission-matrices.ts`.
- **Database**: Neon PostgreSQL with Prisma ORM 7.x.

### Frontend Implementation
- **Next.js 16 App Router**: React 19, Turbopack, Tailwind CSS, Radix UI, Framer Motion.
- **Full UI**: Landing page, Login/Register, Dashboard, Org/Channel Management Modals, Tiptap Rich-Text Chat, Kanban Board with Drag-and-Drop, Task Detail Drawer, Notification Sheet, User Settings.
- **State & Data**: Zustand (auth, unread, UI, notifications), TanStack Query (server state & caching), CASL Ability Provider.

## 3. Recommended Product Structure

Build the system in this hierarchy:

1. Authentication
2. Organization management
3. Organization members and roles
4. Channel management
5. Channel membership and permissions
6. Channel chat
7. Direct messaging
8. Task management
9. Chat-to-task conversion
10. Notifications
11. Search and filters
12. Audit logs and admin tools
13. Testing, security, deployment

## 4. Core Roles And Permission Model

> 📄 **Full permission tables:** [`ROLE_PERMISSIONS.md`](./ROLE_PERMISSIONS.md)
> 📋 **Full architecture plan:** [`ROLE_MANAGEMENT_PLAN.md`](./ROLE_MANAGEMENT_PLAN.md)
> 🏗️ **Frontend Architecture:** [`FRONTEND_ARCHITECTURE.md`](./FRONTEND_ARCHITECTURE.md)
> ⚙️ **Backend Architecture:** [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md)

OmniTask uses a **production-grade Hybrid RBAC + Capability system** (v3).
See the files above for complete permission tables, guard implementation, JWT strategy, and frontend CASL setup.

### Organization Roles (`OrgRole`)

| Role | Description |
|------|-------------|
| `OWNER` | Org creator. Full control. Critical actions require confirmation. |
| `ADMIN` | Manages members, channels, labels. Cannot delete org. |
| `MEMBER` | Default role. Creates tasks, sends messages. |
| `GUEST` | External collaborator. View-only by default. |

### Channel Roles (`ChannelRole`)

| Role | Description |
|------|-------------|
| `MANAGER` | Full channel control — settings, members, board lists. |
| `CONTRIBUTOR` | Can message and create tasks. Cannot manage. |
| `VIEWER` | Read-only. Cannot post or create tasks. |

### Task Assignment Flags (per user, per task)

| Flag | Default | Description |
|------|---------|-------------|
| `can_view` | `true` | Can see the task |
| `can_edit` | `false` | Can edit title, status, priority, due date |
| `can_check` | `false` | Can tick/untick checklist items |
| `can_comment` | `false` | Can post comments |

### Platform Role

| Field | Description |
|-------|-------------|
| `is_superadmin` | OmniTask platform operator. Bypasses all org/channel checks. |

### Permission Resolution Order

```
1. is_superadmin = true       → ALLOW
2. orgRole = OWNER            → ALLOW (+ confirmation on critical actions)
3. Org capability matches     → ALLOW
4. Channel capability matches → ALLOW
5. Task flag matches          → ALLOW
6. Fallback                   → DENY (403)
```

### Core Behavior Rules

- `OWNER` and `ADMIN` **bypass all channel and task-level checks** automatically.
- Task **creator always has full edit access** unless removed from the channel.
- `MEMBER` capabilities can be extended dynamically via `OrganizationSettings` flags.
- All capabilities follow the format `resource.action` (e.g., `channel.delete`, `task.edit`).
- Never hardcode `if (role === 'ADMIN')` — always use the capability check `can('action')`.

## 5. How The System Should Work

## 5.1 Organization Flow

1. User registers and logs in.
2. User creates an organization, for example `Airwix Technologies`.
3. Creator becomes `OWNER`.
4. Owner adds members to the organization.
5. Members are given roles like `ADMIN` or `MEMBER`.

## 5.2 Channel Flow

1. Inside organization, owner/admin creates channels:
   - `ERP`
   - `HRMS`
   - `Finance`
   - `Development`
2. Add members to specific channels.
3. Each channel has:
   - chat
   - tasks
   - member list
   - files later if needed

## 5.3 Personal Chat Flow

1. Any two users in the same organization can start a direct conversation.
2. Messages are private.
3. Read/unread status is tracked.
4. Later you can add typing indicator and online presence.

## 5.4 Task Flow

1. User creates a main task in a channel.
2. User adds subtasks.
3. Each subtask can have child subtasks.
4. Each task or subtask can be assigned to one or multiple users.
5. Assigned users receive notification.
6. Task can be:
   - open
   - in progress
   - completed
   - blocked
   - archived
7. User can open one task detail page and see:
   - title
   - description
   - creator
   - assignees
   - due date
   - priority
   - status
   - linked chat messages
   - subtask tree
   - activity history

## 5.5 Chat To Task Flow

1. User sends a message in chat.
2. Another user clicks `Convert to task`.
3. System creates a task using that message text.
4. Task stores reference to original message.
5. Task detail page can show `Created from chat`.

This will be a strong and useful feature for real team workflow.

## 6. Recommended Database Design

Your current schema is a good start, but for a professional product I recommend expanding it slightly.

### Current core tables

- `users`
- `organizations`
- `organization_members`
- `channels`
- `channel_members`
- `tasks`
- `subtasks`
- `task_assignments`
- `channel_messages`
- `direct_conversations`
- `direct_messages`

### Recommended additional tables

- `task_comments`
- `task_attachments`
- `message_attachments`
- `task_activity_logs`
- `notifications`
- `user_presence`
- `message_reads`
- `task_labels`
- `task_label_links`
- `invites`
- `audit_logs`

### Recommended improvements to task model

Instead of keeping too much task logic split between `Task` and `SubTask`, consider this cleaner model later:

- `tasks`
  - parent_task_id nullable
  - organization_id
  - channel_id
  - creator_id
  - title
  - description
  - status
  - priority
  - due_date
  - position
  - source_message_id nullable

This single self-referencing `tasks` table can handle:

- main task
- subtask
- subtask of subtask

That is often easier to maintain than separate `Task` + `SubTask` models when nesting becomes deep.

If you want faster progress now, you can continue with your current schema first and refactor later.

## 7. Backend Development Todo List

Follow this exact order.

## Phase 1. Foundation Setup

- [x] Finalize project name, domain naming, environment structure
- [x] Set up `.env` properly for backend and frontend
- [x] Finalize PostgreSQL database
- [x] Finalize Prisma schema
- [x] Run Prisma generate and migration
- [x] Add seed data for demo organization, channels, users
- [x] Add shared API response format
- [x] Add logging and error handling standards
- [x] Refactor Task and SubTask schema into a single self-referencing Task model (with parent_task_id)
- [x] Add source_message_id to the Task model to support Chat-to-Task integration
- [x] Add database indexes (@@index) for heavily queried fields like org_id and channel_id
- [x] Add deleted_at field to core models to implement soft-delete functionality

Deliverable:

- backend server runs
- database connects
- migrations work

## Phase 2. Authentication Module

- [x] Create register API
- [x] Create login API
- [x] Create current user profile API
- [x] Add JWT auth middleware
- [x] Add password hashing
- [ ] Add refresh token strategy later if needed
- [x] Add logout logic
- [x] Protect private routes

Backend APIs:

- [x] `POST /auth/register`
- [x] `POST /auth/login`
- [x] `POST /auth/logout`
- [x] `GET /auth/me`

Frontend:

- [x] Register page
- [x] Login page
- [x] Auth store
- [x] Protected route handling

## Phase 3. Organization Module

- [x] Create organization API
- [x] Get all user organizations API
- [x] Get single organization API
- [x] Update organization API
- [x] Delete organization API
- [x] Add organization member API
- [x] Remove organization member API
- [x] Update organization member role API
- [x] Verify onDelete: Cascade in Prisma schema to ensure related channels, tasks, and messages are deleted safely when an organization is removed

Backend APIs:

- [x] `POST /organizations`
- [x] `GET /organizations`
- [x] `GET /organizations/:id`
- [x] `PATCH /organizations/:id`
- [x] `DELETE /organizations/:id`
- [x] `POST /organizations/:id/members`
- [x] `PATCH /organizations/:id/members/:userId`
- [x] `DELETE /organizations/:id/members/:userId`

Frontend:

- [x] Organization dashboard
- [x] Organization settings page / modal
- [x] Member management page / dialog
- [x] Role management UI

Definition of done:

- user can create organization
- owner can manage organization settings
- member list is visible
- roles are working

## Phase 4. Channel Module

- [x] Create channel API
- [x] Get organization channels API
- [x] Get single channel API
- [x] Update channel API
- [x] Delete channel API
- [x] Add member to channel API
- [x] Remove member from channel API
- [x] Update channel member role API

Backend APIs:

- [x] `POST /channels`
- [x] `GET /organizations/:orgId/channels`
- [x] `GET /channels/:id`
- [x] `PATCH /channels/:id`
- [x] `DELETE /channels/:id`
- [x] `POST /channels/:id/members`
- [x] `PATCH /channels/:id/members/:userId`
- [x] `DELETE /channels/:id/members/:userId`

Frontend:

- [x] Channel list in sidebar
- [x] Create channel modal
- [x] Channel settings page / sheet
- [x] Channel members page / sheet

Definition of done:

- owner/admin can create channel
- channel membership is manageable
- channel list loads per organization

## Phase 5. Channel Chat Module

- [x] Finalize Socket.IO connection setup
- [x] Create channel message send API or socket event
- [x] Create channel message list API
- [x] Add pagination for old messages
- [x] Add message delivery in real time
- [x] Add read tracking if needed
- [x] Add edit/delete message rules
- [x] Add basic moderation rules
- [x] Implement JWT authentication inside Socket.io connection handshake (io.use)
- [x] Validate channel membership before allowing a socket client to join a channel:${channelId} room
- [x] Add cursor-based or offset-based pagination to the channel messages API to prevent memory overload

Backend APIs / events:

- [x] `GET /channels/:id/messages`
- [x] `POST /channels/:id/messages`
- [x] `PATCH /messages/:id`
- [x] `DELETE /messages/:id`
- [x] socket `channel:join`
- [x] socket `channel:message:send`
- [x] socket `channel:message:new`

Frontend:

- [x] Channel chat page
- [x] Message list
- [x] Message composer (Tiptap with mentions & emojis)
- [x] Realtime updates
- [x] Infinite scroll / pagination

Definition of done:

- channel members can chat in real time
- messages persist in database

## Phase 6. Direct Message Module

- [x] Create conversation start API
- [x] Get all personal conversations API
- [x] Get personal message list API
- [x] Send personal message API or socket event
- [x] Track unread count
- [x] Mark messages read

Backend APIs:

- [x] `POST /dm/conversations`
- [x] `GET /dm/conversations`
- [x] `GET /dm/conversations/:id/messages`
- [x] `POST /dm/conversations/:id/messages`
- [x] `PATCH /dm/messages/:id/read`

Frontend:

- [x] Direct messages list
- [x] User search to start chat
- [x] Personal chat screen
- [x] Unread badge

Definition of done:

- users can message each other privately
- unread/read works correctly

## Phase 7. Task Management Core

- [x] Create main task API
- [x] Create subtask API
- [x] Create child subtask API
- [x] Get all tasks of a channel API
- [x] Get single task detail API
- [x] Update task API
- [x] Delete task API
- [x] Toggle task/subtask completion
- [x] Add assignee API
- [x] Remove assignee API
- [x] Add due date, priority, status
- [x] Kanban lists management API (Create, reorder, delete lists)

Backend APIs:

- [x] `POST /tasks`
- [x] `GET /channels/:channelId/tasks`
- [x] `GET /tasks/:id`
- [x] `PATCH /tasks/:id`
- [x] `DELETE /tasks/:id`
- [x] `POST /subtasks`
- [x] `PATCH /subtasks/:id`
- [x] `DELETE /subtasks/:id`
- [x] `PATCH /subtasks/:id/toggle`
- [x] `POST /subtasks/:id/assign`
- [x] `DELETE /subtasks/:id/assign/:userId`

Frontend:

- [x] Task list / Kanban board page inside channel
- [x] Task create modal
- [x] Nested subtask UI
- [x] Task detail drawer/page
- [x] Assignee picker
- [x] Status/priority filters
- [x] Drag and drop task reordering

Definition of done:

- create task
- create nested subtasks
- assign task
- open one task detail
- list all tasks in channel

## Phase 8. Chat To Task Integration

- [x] Add `source_message_id` relation
- [x] Create convert-message-to-task endpoint
- [x] Show task creation modal from selected message
- [x] Show linked message inside task detail

Backend APIs:

- [x] `POST /messages/:id/convert-to-task`

Frontend:

- [x] `Convert to task` action on chat message
- [x] linked message preview in task detail

Definition of done:

- chat message can become task
- original context is preserved

## Phase 9. Notifications Module

- [x] Create notification table
- [x] Trigger notification on:
  - task assigned
  - message mention
  - DM received
  - task status changed
  - user added to channel
- [x] Mark notification as read
- [x] Show unread count

Backend APIs:

- [x] `GET /notifications`
- [x] `PATCH /notifications/:id/read`
- [x] `PATCH /notifications/read-all`

Frontend:

- [x] Notification bell
- [x] Notification list panel

## Phase 10. Search And Filters

- [x] Global search
- [x] Search organizations
- [x] Search channels
- [x] Search messages
- [x] Search tasks
- [x] Filter tasks by:
  - assignee
  - status
  - priority
  - due date
- [x] Sort by latest, oldest, deadline, priority

## Phase 11. Activity Logs And Audit

- [x] Store task activity history
- [x] Store organization audit logs
- [x] Track:
  - task created
  - task assigned
  - status changed
  - member added
  - channel created
  - message deleted

This is very useful in professional products.

## Phase 12. File Attachments

- [x] Upload attachment in channel chat
- [x] Upload attachment in direct message
- [x] Upload attachment in task comments
- [x] Store files in Cloudinary / local for dev

## Phase 13. Testing And Security

- [x] Unit tests for services
- [x] Integration tests for APIs
- [x] Permission tests (CASL & Fastify guards)
- [x] Validation tests (Zod schemas)
- [x] Rate limiting
- [x] Input sanitization
- [x] CORS hardening
- [x] Secure cookies if using refresh tokens
- [x] SQL injection safety review (Prisma parameterized queries)
- [x] XSS safety for chat rendering (DOMPurify / Tiptap safe parsing)

## Phase 14. Deployment

- [x] Deploy frontend (Vercel / Custom domain `omnitask.himanshudev.dpdns.org`)
- [x] Deploy backend (Fly.io / VPS Docker)
- [x] Deploy PostgreSQL (Neon Serverless DB)
- [x] Configure environment variables
- [x] Configure domain and HTTPS (Cloudflare SSL)
- [x] Configure logs and monitoring
- [x] Configure backups

## 8. Recommended Frontend Pages

Create the frontend in this structure.

### Public pages

- [x] Landing page
- [x] Login page
- [x] Register page

### App pages

- [x] Dashboard
- [x] Organization page
- [x] Organization settings
- [x] Organization members
- [x] Channel page
- [x] Channel settings
- [x] Channel members
- [x] Channel chat page
- [x] Direct messages page
- [x] Task board page
- [x] Task detail page
- [x] Notifications page
- [x] User profile page

## 9. Recommended Backend Module Structure

Use a clean structure like this:

- `controllers`
- `services`
- `repositories`
- `routes`
- `schemas`
- `middlewares`
- `plugins`
- `utils`
- `lib`

For each feature:

- `organization.controller.ts`
- `organization.service.ts`
- `organization.schema.ts`
- `organization.routes.ts`
- `organization.repository.ts` if needed

Do the same for:

- auth
- organization
- channel
- chat
- dm
- task
- notification

## 10. Professional Features You Should Add

These will make the product much stronger.

### Must-have professional features

- Invite user by email
- Notification system
- Task due date
- Task priority
- Task status
- Message unread count
- Mention users with `@name`
- Activity log
- Search
- Pagination
- Soft delete where useful

### Very useful advanced features

- Presence: online/offline
- Typing indicator
- Pinned messages
- Starred tasks
- Saved messages
- Task comments
- Task watchers
- Recurring tasks
- Calendar view
- Kanban board view
- List view
- My tasks page
- Admin analytics dashboard

### Future enterprise features

- SSO login
- Multi-tenant billing
- Department-level reporting
- Role templates
- Approval workflows
- Time tracking
- SLA and escalation rules

## 11. Suggested Final Product Modules

Your finished product can be divided into these major modules:

1. Identity and access
2. Organization workspace
3. Channel communication
4. Direct communication
5. Task and workflow management
6. Notifications and alerts
7. Search and reporting
8. Admin and audit system

## 12. API Build Order You Should Follow

If you want the simplest execution order, use this exact sequence:

1. Finish auth APIs
2. Finish organization CRUD
3. Finish organization members APIs
4. Finish channel CRUD
5. Finish channel member APIs
6. Finish channel message APIs
7. Finish direct message APIs
8. Finish task CRUD
9. Finish nested subtask APIs
10. Finish task assignment APIs
11. Add chat-to-task conversion
12. Add notifications
13. Add search and filters
14. Add audit logs
15. Add attachments
16. Add tests and deployment

## 13. Recommended MVP Scope

Do not build everything at once. Build MVP first.

### MVP features

- user auth
- create organization
- add members to organization
- create channels
- add members to channel
- channel chat
- direct chat
- task creation
- nested subtasks
- task assignment
- task list
- task detail view

### Phase 2 after MVP

- notifications
- mentions
- activity logs
- search
- file attachments
- task comments
- due dates and reminders

## 14. Recommended UI/UX Behavior

- Left sidebar:
  - organizations
  - channels
  - direct messages
- Center area:
  - chat or task content
- Right panel:
  - task detail, members, or activity

Recommended patterns:

- chat and task should be linked, not separate worlds
- every task should show who created it
- every task should show assignees clearly
- nested subtasks should be collapsible
- status colors should be consistent
- unread counts should be clearly visible

## 15. Suggested Tech Stack

Your current stack is correct and should continue:

- Frontend: Next.js
- UI: Tailwind CSS + shadcn/ui
- State: Zustand + TanStack Query
- Forms: React Hook Form + Zod
- Backend: Fastify
- Database: PostgreSQL
- ORM: Prisma
- Realtime: Socket.IO
- Validation: Zod

## 16. Best Websites To Follow For Development

Use official documentation first.

### Frontend

- [Next.js](https://nextjs.org/docs)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com)

### Backend

- [Fastify](https://fastify.dev/docs/latest/)
- [Prisma](https://www.prisma.io/docs)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Socket.IO](https://socket.io/docs/v4/)
- [Zod](https://zod.dev)
- [JWT Introduction](https://jwt.io/introduction)

### Architecture And Product Reference

- [Linear](https://linear.app)
- [ClickUp](https://clickup.com)
- [Slack](https://slack.com)
- [Notion](https://www.notion.so)
- [Microsoft Teams](https://www.microsoft.com/microsoft-teams/group-chat-software)

Use these reference products to study:

- sidebar structure
- chat flow
- task detail layout
- notifications
- activity history
- permission handling

## 17. Recommended Naming Ideas

You already use `OmniTask` in the frontend. That is good.

Other possible names:

- OmniTask
- omnitask
- WorkMesh
- CollabNest
- TaskFlow Hub

If you want a professional SaaS-style name, `OmniTask` is good enough to continue.

## 18. Final Step-By-Step Master Todo

Use this as your main checklist.

- [x] Finalize schema and migrations
- [x] Finish authentication
- [x] Finish organization CRUD
- [x] Finish organization member management
- [x] Finish channel CRUD
- [x] Finish channel member management
- [x] Build channel chat
- [x] Build direct messages
- [x] Build task CRUD
- [x] Build nested subtasks
- [x] Build task assignment
- [x] Build task detail page
- [x] Build chat-to-task conversion
- [x] Add notifications
- [x] Add search and filters
- [x] Add task comments and activity
- [x] Add file attachments
- [x] Add testing
- [x] Add security hardening
- [x] Deploy frontend, backend, and database

## 19. Important Advice

- Build MVP first.
- Keep permissions strict from the beginning.
- Do not overcomplicate the task schema too early.
- Make real-time chat stable before adding too many advanced features.
- Add audit logs before production.
- Write API and UI feature by feature, not everything together.

## 20. What You Should Do Next

Start from these 5 immediate tasks:

1. Complete Prisma schema and migrations.
2. Complete auth APIs and frontend auth flow.
3. Complete organization CRUD and member management.
4. Complete channel CRUD and member management.
5. Complete task CRUD before building advanced chat-task integration.

If you want the best development flow, build in this order:

`Auth -> Organization -> Channel -> Chat -> Task -> Notifications -> Search -> Deployment`
