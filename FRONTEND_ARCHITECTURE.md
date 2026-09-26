# OmniTask — Frontend Architecture & Behavioral Safeguards

> **Purpose:** Definitive, battle-tested Next.js frontend architecture for OmniTask. This document outlines the structural foundation and the behavioral safeguards for concurrency, offline states, security, and telemetry.

---

## 1. Folder Structure (Next.js App Router)

This structure follows a feature-based approach for complex modules while maintaining centralized shared resources.

```text
frontend/src/
├── app/                              # Next.js 16 App Router
│   ├── (auth)/                       # Grouped auth routes (login, register)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                        # Authenticated app shell
│   │   ├── (dashboard)/              # Main dashboard & analytics
│   │   ├── (organizations)/          # Organization views & settings
│   │   └── (channels)/               # Channel chat & Kanban task views
│   ├── layout.tsx                    # Root layout & providers
│   ├── globals.css                   # Global styles & Tailwind v4 tokens
│   ├── loading.tsx                   # Top-level loading fallback
│   └── not-found.tsx                 # 404 handler
│
├── components/                       
│   ├── layout/                       # App Shell, Headers, Sidebar, User Profile Modal
│   │   ├── app-header.tsx
│   │   ├── app-sidebar.tsx
│   │   ├── app-shell-headers.tsx
│   │   ├── new-dm-dialog.tsx
│   │   └── user-profile-settings-modal.tsx
│   ├── organizations/                # Organization & Channel management modals
│   │   ├── OrganizationCard.tsx
│   │   ├── organization-settings-modal.tsx
│   │   ├── channel-management-sheet.tsx
│   │   ├── create-channel-dialog.tsx
│   │   └── invite-member-dialog.tsx
│   ├── tasks/                        # Kanban Board, Task Details, Subtasks, Dialogs
│   │   ├── TaskBoard.tsx
│   │   ├── MyTasksView.tsx
│   │   ├── task-detail-dialog.tsx
│   │   ├── create-task-dialog.tsx
│   │   └── create-list-dialog.tsx
│   ├── notifications/                # In-app notifications list & bell
│   │   └── notification-list.tsx
│   ├── providers/                    # Context providers
│   │   └── AbilityProvider.tsx       # CASL RBAC capability context
│   ├── ui/                           # Base UI components (Radix UI + Tailwind)
│   │   ├── orbital-loader.tsx        # Branded loading spinner
│   │   ├── offline-overlay.tsx       # Network offline detection banner
│   │   ├── server-startup-overlay.tsx# Cold-start / wake-up detection overlay
│   │   └── [shadcn components]       # Button, Dialog, Sheet, Table, Tabs, etc.
│   ├── ChatInputBox.tsx              # Rich-text message composer
│   └── TiptapEditor.tsx              # WYSIWYG editor with mention & emoji extensions
│
├── hooks/                            # Custom React hooks
│   ├── useTaskRealtime.ts            # Socket synchronization for Kanban & Tasks
│   ├── useOnlineStatus.ts            # Network connectivity tracking
│   ├── useSyncedState.ts             # Cross-component state synchronization
│   ├── useDebounce.ts                # Input and search debouncing
│   ├── useIsMounted.ts               # SSR / hydration safety
│   └── use-mobile.ts                 # Responsive layout breakpoint hook
│
├── lib/                              # Core utilities & shared logic
│   ├── casl.ts                       # CASL Ability definition via shared/permission-matrices.ts
│   ├── query-client.tsx              # TanStack Query client & caching setup
│   ├── mentions.ts                   # User mention parsing & formatting
│   ├── file-url.ts                   # Cloudinary / CDN asset URL resolver
│   ├── form.tsx                      # React Hook Form helpers
│   └── utils.ts                      # Tailwind merging (clsx + twMerge)
│
├── socket/                           
│   └── socket.ts                     # Socket.IO client instance, reconnection & telemetry
│
├── store/                            # Global client state (Zustand)
│   ├── auth.store.ts                 # User authentication & session state
│   ├── notification.store.ts         # In-app notification state
│   ├── ui.store.ts                   # Modals, sidebars, active view state
│   └── unread.store.ts               # Unread message & badge tracking
│
├── types/                            # Frontend TypeScript declarations
│   ├── api.ts                        # Request/Response DTOs
│   └── roles.ts                      # Role types & capability mappings
│
└── api/                              
    └── api.ts                        # Axios instance, JWT interceptor & auto-refresh logic
```


---

## 2. Behavioral Safeguards (The Final 10%)

Architecture is defined not just by where files live, but by how the system behaves under stress and concurrency.

### A. Race Conditions & Conflict Resolution
We implement **Optimistic Concurrency Control (OCC)** to prevent stale data from overwriting fresh updates.
* **Version Control:** Every entity (`Task`, `Message`) includes a `version` (integer) or `updatedAt` timestamp.
* **Socket Filtering:** In `use-chat-socket.ts`, when a `task:updated` event arrives, the client compares:
  `incoming.updatedAt > cached.updatedAt`. 
  If false, the event is ignored, preventing old socket broadcasts from clobbering a newer local optimistic state.
* **Conflict Handling:** If a mutation returns `409 Conflict` (indicating a server-side version mismatch), TanStack Query triggers `onError`, rolls back the optimistic UI, and displays a toast: *"Task was modified by another user. Refreshing."*

### B. Offline & Network Resilience
* **Detection:** The `<NetworkProvider />` monitors `window.addEventListener('offline')` and `online`.
* **Visual Feedback:** Triggers a global `<OfflineBanner />`. Critical mutation buttons (e.g., "Delete Channel") are disabled.
* **Queuing:** Read queries rely on TanStack's local cache. Mutations are either paused or pushed to a background queue using TanStack Query's experimental persisters.

### C. Throttling & Rate Limiting (Client-side)
* **Typing Indicators:** To avoid overwhelming the server, `useThrottle` restricts the `user:typing` socket emit to once every 2 seconds.
* **Drag and Drop:** Kanban card movements use a debounce/throttle hybrid on `onDragEnd` to ensure only the final position is persisted to the API after rapid user interaction.

### D. Security & XSS Prevention
* **Sanitization:** TipTap produces HTML which is inherently risky. `lib/security.ts` provides a hardened `DOMPurify.sanitize()` wrapper.
* **Strict Rendering:** Every `<MessageBubble />` or `<TaskDescription />` passes its content through the sanitizer before using `dangerouslySetInnerHTML`.

### E. Analytics & Memory Management
* **Monitoring:** `lib/monitoring.ts` initializes Sentry and Web Vitals. `app/global-error.tsx` ensures every unhandled exception is captured with full context.
* **Teardown:** To prevent memory leaks (especially with React 18's double-mounting in dev), every socket listener and IntersectionObserver is wrapped in a strict `useEffect` cleanup block:
  ```typescript
  useEffect(() => {
    socket.on('event', handler);
    return () => socket.off('event', handler);
  }, []);
  ```

### F. Data Prefetching & Feature Flags
* **Prefetching:** `use-prefetch.ts` triggers `queryClient.prefetchQuery` on hover. Hovering over a Channel in the sidebar fetches the first page of messages before the click occurs.
* **Feature Flags:** The `feature-flags.ts` utility maps missing flags to fallback UIs (e.g., `<EmptyState type="feature-locked" />`) rather than throwing errors or rendering blank screens.

### G. Testing Strategy
* **Unit Tests:** Vitest/Jest for pure logic (`lib/security.ts`, `lib/casl.ts`).
* **Integration Tests:** React Testing Library for testing the interplay between hooks, Zustand stores, and mocked API responses.
* **E2E Tests:** Playwright validating critical user paths: `Login` → `Select Org` → `Open Channel` → `Create Task`.
