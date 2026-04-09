# Project Planning Document: Synkro Enterprise Hub
**Document Type:** System Architecture & Blueprint
**Version:** 1.0

## 1. Project Overview
Synkro ek advance, collaborative workspace chhe je team management, real-time chat, ane highly granular task management nu combination chhe. Aa system ma hierarchy (Organization > Channel) pramane data isolate thase ane strictly role-based permissions hase.

## 2. Technology Stack
*   **Frontend:** Next.js (App Router), Tailwind CSS, Shadcn UI
*   **State Management:** Zustand (Client state), TanStack Query (Server state/caching)
*   **Forms & Validation:** React Hook Form + Zod
*   **Backend:** Node.js sathe Fastify (for high performance)
*   **Database & ORM:** PostgreSQL sathe Prisma ORM
*   **Real-time Communication:** Socket.io (Chat ane live task updates mate)

## 3. Role-Based Access Control (RBAC) & Hierarchy
System ma clear hierarchy hase jethi data security jalvai rahe ane team members resign kare to pan kaam atke nahi.

### 3.1 Organization Levels
1.  **Organization Admin (Company Owner):**
    *   Super-user rights.
    *   Koi pan channel ma task banavi, edit, ke delete kari shake.
    *   Koi pan user na banavela task ne override, edit, ke re-assign kari shake (employee leave ke resign kare teva case mate).
2.  **Channel Manager (Team Lead):**
    *   Particular channel purta Admin rights.
    *   Channel na koi pan member na task ne manage, edit, ke delete kari shake.
3.  **Channel Member (Regular User):**
    *   Pote banavela task add/edit/delete kari shake.
    *   Bija na banavela task default rite edit NA kari shake.

### 3.2 Granular Task Permissions
*   **VIEW_ONLY:** Task khali joi shake.
*   **CHECK_ONLY:** Task joi shake ane checkbox check/uncheck kari shake. (Admin na task par default).
*   **EDIT_ALLOWED:** Task na text ne edit pan kari shake.

## 4. Edge Cases Handled
*   **User Resignation / Inactive User:** Jyare koi employee company chhode, tyare enu account `is_active = false` thase. Ena banavela task delete nahi thay. Organization Admin ke Channel Manager pase e badha pending task ne bija active user ne assign karvano aadhikar (override power) hase.

## 5. Database Schema Structure (Prisma Approach)

### Core Models
*   `User`: id, name, email, password, is_active
*   `Organization`: id, name, owner_id
*   `Channel`: id, name, org_id
*   `ChannelMember`: user_id, channel_id, role (MANAGER/MEMBER)

### Task Models
*   `Task` (Main List/Header): id, title, channel_id, creator_id, created_at
*   `SubTask` (Nested Checkboxes): id, task_id, parent_id (for nesting), text, is_completed
*   `TaskAssignment`: subtask_id, assignee_id, permission_type (CHECK_ONLY / EDIT)

### Chat Models
*   `ChannelMessage`: id, channel_id, sender_id, text, created_at
*   `DirectConversation`: id, user1_id, user2_id (1-on-1 chat mate)
*   `DirectMessage`: id, conversation_id, sender_id, text, created_at, is_read

## 6. Core Features Flow

### A. The "Google Keep" Style Task Manager
1.  User channel ma aavi ne nado task (Header) banavse.
2.  Ema multiple sub-tasks (nested list) add karse.
3.  Pachhi specific sub-task par click kari ne "Assign to" dropdown mathi user (e.g., Raj) select karse ane permission aapse (e.g., "Check Only").
4.  Jo task assign nahi thayo hoy, to te khali creator ane admin ne j dekhase.

### B. Chat System
1.  **Channel Chat:** Channel na badha active members real-time messages kari shakse.
2.  **Direct Messages (DM):** Organization na koi pan be members ekbija sathe private chat kari shakse.

## 7. Development Roadmap (Step-by-Step)
*   **Phase 1:** PostgreSQL setup ane Prisma schema creation. Database push.
*   **Phase 2:** Fastify backend setup, JWT Authentication, ane Users/Org/Channels CRUD APIs.
*   **Phase 3:** Next.js setup, login screen, ane dashboard layout (Sidebar with channels).
*   **Phase 4:** Socket.io integration for real-time text chat (Channel & DMs).
*   **Phase 5:** Task Management APIs (Create nested tasks, Assign users, Check/Uncheck logic).
*   **Phase 6:** Frontend Task UI building (recursive components for nested tasks like Notion/Keep).
*   **Phase 7:** Testing permissions (Admin override, Member restrictions) ane deployment.