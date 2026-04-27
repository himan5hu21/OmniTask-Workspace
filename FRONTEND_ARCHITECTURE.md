# OmniTask — Frontend Architecture & Behavioral Safeguards

> **Purpose:** Definitive, battle-tested Next.js frontend architecture for OmniTask. This document outlines the structural foundation and the behavioral safeguards for concurrency, offline states, security, and telemetry.

---

## 1. Folder Structure (Next.js App Router)

This structure follows a feature-based approach for complex modules while maintaining centralized shared resources.

```text
src/
├── app/                              
│   ├── global-error.tsx              # Catch-all for hydration and runtime errors
│   ├── (auth)/                       # Grouped auth routes (login, register)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                        # Authenticated app routes
│   │   ├── layout.tsx                # App Shell: Auth, Sync, Offline Banner
│   │   ├── orgs/page.tsx             # Organization selector
│   │   └── org/[orgId]/
│   │       ├── layout.tsx            # Org Shell: Sidebar, Icons
│   │       ├── channels/page.tsx     
│   │       ├── channel/[channelId]/  
│   │       │   ├── layout.tsx        
│   │       │   └── page.tsx          # Chat + Tasks Tab View
│   │       └── settings/page.tsx     
│   └── globals.css                   
│
├── components/                       
│   ├── providers/                    
│   │   ├── app-providers.tsx         # Root provider wrapper
│   │   ├── auth-provider.tsx         # Auth state hydration
│   │   ├── sync-provider.tsx         # Cross-tab state synchronization
│   │   ├── network-provider.tsx      # Offline detection & mutation queue
│   │   └── query-provider.tsx        # TanStack Query client configuration
│   ├── ui/                           # Base UI components (shadcn/ui)
│   ├── layout/                       
│   │   └── offline-banner.tsx        # Global offline warning UI
│   └── shared/                       
│       ├── states/                   # Common empty states, loaders
│       ├── form/                     # Shared form fields (Input, Select, etc.)
│       ├── upload/                   # File upload components
│       └── rich-text/                # TipTap Renderer + Sanitizer
│
├── features/                         # Domain-specific logic and components
│   ├── activity/                     # Audit logs, activity feeds
│   ├── auth/                         # Login/Register forms, social auth
│   ├── channels/                     # Channel creation, member management
│   ├── chat/                         # Real-time messaging
│   │   ├── components/               
│   │   ├── hooks/use-chat-socket.ts  # Socket event handlers with version checks
│   │   └── store/chat-ui.store.ts    
│   ├── notifications/                
│   ├── search/                       
│   └── tasks/                        # Kanban, Task details, Subtasks
│       ├── components/               
│       ├── hooks/use-optimistic-task.ts # Optimistic updates + conflict resolution
│       └── store/task-filters.store.ts 
│
├── hooks/                            
│   ├── use-permissions.ts            # CASL capability checks
│   ├── use-cross-tab-sync.ts         # BroadcastChannel sync logic
│   ├── use-infinite-scroll.ts        
│   ├── use-throttle.ts               # Action throttling (typing, DND)
│   ├── use-prefetch.ts               # Route & Data prefetching
│   └── use-cleanup.ts                # Centralized observer/listener teardown
│
├── lib/                              
│   ├── api.ts                        # Axios/Fetch instance with interceptors
│   ├── query-keys.ts                 # Centralized TanStack Query keys
│   ├── casl.ts                       # Permission logic (abilities)
│   ├── feature-flags.ts              # UI fallback mapping for flags
│   ├── monitoring.ts                 # Sentry, Web Vitals, Custom Analytics
│   ├── security.ts                   # XSS Sanitizers (DOMPurify)
│   └── utils.ts                      # Formatting, Tailwind merging
│
├── services/                         # API communication layer
│   ├── auth.service.ts
│   ├── task.service.ts
│   └── upload.service.ts             
│
├── store/                            # Global UI state (Zustand)
│   └── auth.store.ts                 
│
└── types/                            
    ├── api.types.ts                  # DTOs and API responses
    └── models.types.ts               # Domain entities (Task, User, etc.)

tests/                                
├── e2e/                              # Playwright flows (Login, Create Task)
├── integration/                      # Hook + Store + Query interplay
└── unit/                             # Utils, sanitizers, permission checks
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
