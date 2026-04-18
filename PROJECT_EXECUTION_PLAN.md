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

After checking the workspace, this is already prepared:

### Backend already started

- Authentication structure exists.
- Organization APIs are partially implemented.
- Channel APIs are partially implemented.
- Prisma schema is started for:
  - users
  - organizations
  - organization members
  - channels
  - channel members
  - tasks
  - subtasks
  - task assignments
  - channel messages
  - direct conversations
  - direct messages
- Socket plugin exists.
- Service layer for organizations and channels exists.

### Frontend already started

- Landing page exists.
- Login and register pages exist.
- Dashboard exists.
- Organization listing and create organization UI exist.
- API service structure exists.

### Major missing or incomplete areas

- Task APIs are mostly placeholder/TODO.
- Chat flow is not fully implemented end-to-end.
- Direct message flow is not implemented end-to-end.
- Organization/channel update-delete flows are not fully documented or connected in UI.
- Permission system needs to be completed carefully.
- Notification, search, audit log, file attachment, and production hardening are still missing.

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

Use a professional RBAC model from the beginning.

### Organization roles

- `OWNER`
- `ADMIN`
- `MEMBER`

### Channel roles

- `MANAGER`
- `MEMBER`

### Task permissions

- `VIEW_ONLY`
- `CHECK_ONLY`
- `EDIT_ALLOWED`

### Recommended permission behavior

- `OWNER`
  - full organization control
  - create/update/delete organization
  - create/update/delete channels
  - add/remove organization members
  - override any task and assignment
- `ADMIN`
  - manage channels and members
  - manage tasks inside the organization
- `CHANNEL_MANAGER`
  - manage a specific channel
  - assign tasks in that channel
  - moderate channel chat
- `MEMBER`
  - chat in channels they belong to
  - send direct messages
  - create tasks where allowed
  - update only own or assigned tasks based on permission

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
- [ ] Verify onDelete: Cascade in Prisma schema to ensure related channels, tasks, and messages are deleted safely when an organization is removed

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

- [ ] Organization dashboard
- [ ] Organization settings page
- [ ] Member management page
- [ ] Role management UI

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

- [ ] Channel list in sidebar
- [ ] Create channel modal
- [ ] Channel settings page
- [ ] Channel members page

Definition of done:

- owner/admin can create channel
- channel membership is manageable
- channel list loads per organization

## Phase 5. Channel Chat Module

- [x] Finalize Socket.IO connection setup
- [x] Create channel message send API or socket event
- [x] Create channel message list API
- [ ] Add pagination for old messages
- [ ] Add message delivery in real time
- [ ] Add read tracking if needed
- [ ] Add edit/delete message rules
- [ ] Add basic moderation rules
- [ ] Implement JWT authentication inside Socket.io connection handshake (io.use)
- [ ] Validate channel membership before allowing a socket client to join a channel:${channelId} room
- [ ] Add cursor-based or offset-based pagination to the channel messages API to prevent memory overload

Backend APIs / events:

- [x] `GET /channels/:id/messages`
- [x] `POST /channels/:id/messages`
- [ ] `PATCH /messages/:id`
- [ ] `DELETE /messages/:id`
- [ ] socket `channel:join`
- [ ] socket `channel:message:send`
- [ ] socket `channel:message:new`

Frontend:

- [ ] Channel chat page
- [ ] Message list
- [ ] Message composer
- [ ] Realtime updates
- [ ] Infinite scroll

Definition of done:

- channel members can chat in real time
- messages persist in database

## Phase 6. Direct Message Module

- [ ] Create conversation start API
- [ ] Get all personal conversations API
- [ ] Get personal message list API
- [ ] Send personal message API or socket event
- [ ] Track unread count
- [ ] Mark messages read

Backend APIs:

- [ ] `POST /dm/conversations`
- [ ] `GET /dm/conversations`
- [ ] `GET /dm/conversations/:id/messages`
- [ ] `POST /dm/conversations/:id/messages`
- [ ] `PATCH /dm/messages/:id/read`

Frontend:

- [ ] Direct messages list
- [ ] User search to start chat
- [ ] Personal chat screen
- [ ] Unread badge

Definition of done:

- users can message each other privately
- unread/read works correctly

## Phase 7. Task Management Core

- [ ] Create main task API
- [ ] Create subtask API
- [ ] Create child subtask API
- [ ] Get all tasks of a channel API
- [ ] Get single task detail API
- [ ] Update task API
- [ ] Delete task API
- [ ] Toggle task/subtask completion
- [ ] Add assignee API
- [ ] Remove assignee API
- [ ] Add due date, priority, status

Backend APIs:

- [ ] `POST /tasks`
- [ ] `GET /channels/:channelId/tasks`
- [ ] `GET /tasks/:id`
- [ ] `PATCH /tasks/:id`
- [ ] `DELETE /tasks/:id`
- [ ] `POST /subtasks`
- [ ] `PATCH /subtasks/:id`
- [ ] `DELETE /subtasks/:id`
- [ ] `PATCH /subtasks/:id/toggle`
- [ ] `POST /subtasks/:id/assign`
- [ ] `DELETE /subtasks/:id/assign/:userId`

Frontend:

- [ ] Task list page inside channel
- [ ] Task create modal
- [ ] Nested subtask UI
- [ ] Task detail drawer/page
- [ ] Assignee picker
- [ ] Status/priority filters

Definition of done:

- create task
- create nested subtasks
- assign task
- open one task detail
- list all tasks in channel

## Phase 8. Chat To Task Integration

- [ ] Add `source_message_id` relation
- [ ] Create convert-message-to-task endpoint
- [ ] Show task creation modal from selected message
- [ ] Show linked message inside task detail

Backend APIs:

- [ ] `POST /messages/:id/convert-to-task`

Frontend:

- [ ] `Convert to task` action on chat message
- [ ] linked message preview in task detail

Definition of done:

- chat message can become task
- original context is preserved

## Phase 9. Notifications Module

- [ ] Create notification table
- [ ] Trigger notification on:
  - task assigned
  - message mention
  - DM received
  - task status changed
  - user added to channel
- [ ] Mark notification as read
- [ ] Show unread count

Backend APIs:

- [ ] `GET /notifications`
- [ ] `PATCH /notifications/:id/read`
- [ ] `PATCH /notifications/read-all`

Frontend:

- [ ] Notification bell
- [ ] Notification list panel

## Phase 10. Search And Filters

- [ ] Global search
- [ ] Search organizations
- [ ] Search channels
- [ ] Search messages
- [ ] Search tasks
- [ ] Filter tasks by:
  - assignee
  - status
  - priority
  - due date
- [ ] Sort by latest, oldest, deadline, priority

## Phase 11. Activity Logs And Audit

- [ ] Store task activity history
- [ ] Store organization audit logs
- [ ] Track:
  - task created
  - task assigned
  - status changed
  - member added
  - channel created
  - message deleted

This is very useful in professional products.

## Phase 12. File Attachments

- [ ] Upload attachment in channel chat
- [ ] Upload attachment in direct message
- [ ] Upload attachment in task comments
- [ ] Store files in S3 / Cloudinary / local for dev

## Phase 13. Testing And Security

- [ ] Unit tests for services
- [ ] Integration tests for APIs
- [ ] Permission tests
- [ ] Validation tests
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] CORS hardening
- [ ] Secure cookies if using refresh tokens
- [ ] SQL injection safety review
- [ ] XSS safety for chat rendering

## Phase 14. Deployment

- [ ] Deploy frontend
- [ ] Deploy backend
- [ ] Deploy PostgreSQL
- [ ] Configure environment variables
- [ ] Configure domain and HTTPS
- [ ] Configure logs and monitoring
- [ ] Configure backups

## 8. Recommended Frontend Pages

Create the frontend in this structure.

### Public pages

- [ ] Landing page
- [ ] Login page
- [ ] Register page

### App pages

- [ ] Dashboard
- [ ] Organization page
- [ ] Organization settings
- [ ] Organization members
- [ ] Channel page
- [ ] Channel settings
- [ ] Channel members
- [ ] Channel chat page
- [ ] Direct messages page
- [ ] Task board page
- [ ] Task detail page
- [ ] Notifications page
- [ ] User profile page

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

- [ ] Finalize schema and migrations
- [ ] Finish authentication
- [ ] Finish organization CRUD
- [ ] Finish organization member management
- [ ] Finish channel CRUD
- [ ] Finish channel member management
- [ ] Build channel chat
- [ ] Build direct messages
- [ ] Build task CRUD
- [ ] Build nested subtasks
- [ ] Build task assignment
- [ ] Build task detail page
- [ ] Build chat-to-task conversion
- [ ] Add notifications
- [ ] Add search and filters
- [ ] Add task comments and activity
- [ ] Add file attachments
- [ ] Add testing
- [ ] Add security hardening
- [ ] Deploy frontend, backend, and database

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
