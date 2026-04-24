# OmniTask — Frontend Design Specification

> **Purpose:** Complete page-by-page design blueprint for every screen in OmniTask.
> Use this with Stitch (or any UI tool) to generate pixel-accurate designs.
> Based on: ROLE_MANAGEMENT_PLAN.md, ROLE_PERMISSIONS.md, PRODUCTION_HARDENING.md, and all Prisma schemas.

---

## Design System

### Color Palette

```
Background (deepest):   #0A0B0F   → near-black, app shell background
Background (surface):   #111218   → sidebar, panels
Background (elevated):  #1A1C27   → cards, modals, dropdowns
Background (hover):     #22263A   → hover states on sidebar items

Border (subtle):        #2A2D3E   → dividers, card borders
Border (focus):         #4F6EF7   → focus ring on inputs

Text (primary):         #F0F2FF   → headings, body text
Text (secondary):       #8B91B3   → labels, meta info, placeholders
Text (muted):           #4A4F6A   → disabled, ghost text

Accent (primary):       #4F6EF7   → blue-violet, primary CTA, links
Accent (hover):         #6B86FF   → hover on primary buttons
Accent (danger):        #F75A5A   → delete, remove, destructive actions
Accent (danger hover):  #FF7070   → hover on danger buttons
Accent (success):       #3DCC91   → success states, online indicators
Accent (warning):       #F7A84F   → warnings, rate-limit notices

Role Colors:
  OWNER:       #FFD700   → gold
  ADMIN:       #A78BFA   → purple
  MEMBER:      #60A5FA   → blue
  GUEST:       #6B7280   → gray
  MANAGER:     #34D399   → green
  CONTRIBUTOR: #60A5FA   → blue
  VIEWER:      #6B7280   → gray
```

### Typography

```
Font Family:   'Inter', sans-serif  (Google Fonts)
Font Weights:  400 (regular), 500 (medium), 600 (semibold), 700 (bold)

Heading 1:   28px / 700 / #F0F2FF
Heading 2:   22px / 600 / #F0F2FF
Heading 3:   17px / 600 / #F0F2FF
Body:        14px / 400 / #F0F2FF
Body Small:  13px / 400 / #8B91B3
Caption:     12px / 400 / #4A4F6A
Label:       11px / 600 / #8B91B3 / UPPERCASE TRACKING
```

### Spacing & Radius

```
Spacing scale:  4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64px
Border radius:  4px (inputs), 8px (cards, buttons), 12px (modals), 16px (sheets)
Sidebar width:  240px (org sidebar) + 56px (icon rail)
```

### Shadows & Effects

```
Card shadow:      0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)
Modal shadow:     0 8px 48px rgba(0,0,0,0.6)
Glassmorphism:    backdrop-filter: blur(12px); background: rgba(26,28,39,0.85)
Focus ring:       0 0 0 2px #4F6EF7
Transition:       all 0.15s cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Layout Architecture

### Root Shell (after login)

```
┌─────────────────────────────────────────────────────────┐
│  [ICON RAIL 56px] [ORG SIDEBAR 240px] [MAIN CONTENT]   │
│                                                         │
│  Icon Rail: org avatar switcher + home + DMs + settings │
│  Org Sidebar: channel list + members section            │
│  Main Content: channel/task/settings view               │
└─────────────────────────────────────────────────────────┘
```

### Layout Types

1. **AuthLayout** — centered card, no sidebar, dark background
2. **AppShell** — icon rail + org sidebar + main content (most pages)
3. **FullscreenModal** — overlays AppShell (task detail, settings)
4. **EmptyState** — AppShell but main content shows illustration + CTA

---

## Pages & Routes

---

### PAGE 1 — Landing / Login

**Route:** `/login`
**Layout:** AuthLayout (full page centered)

**What shows:**
- Logo: "OmniTask" in #4F6EF7, bold, 32px + small lightning bolt icon
- Tagline: "Work together. Ship faster." in #8B91B3
- Card (background #1A1C27, border #2A2D3E, radius 12px, padding 40px):
  - "Welcome back" heading
  - Email input (full width)
  - Password input with show/hide toggle
  - "Forgot password?" link right-aligned in #4F6EF7
  - "Sign in" button — full width, #4F6EF7 background, white text, 44px height
  - Divider "OR"
  - "Create an account" link → /register
- Below card: "OmniTask v1.0 · Private Beta" caption in #4A4F6A

**Error states:**
- Rate-limited (429): amber banner at top of card — "Too many attempts. Try again in 60s."
- Invalid credentials (401): red text below password input

**Background:** #0A0B0F with subtle radial gradient in top-right: `radial-gradient(600px at 80% 20%, rgba(79,110,247,0.08), transparent)`

---

### PAGE 2 — Register

**Route:** `/register`
**Layout:** AuthLayout

**What shows:**
- Same logo + tagline as login
- Card:
  - "Create your account" heading
  - Full Name input
  - Email input
  - Password input (show/hide) — min 8 chars hint below
  - Confirm Password input
  - "Create account" button — full width, accent blue
  - "Already have an account? Sign in" link → /login

**Validation:** Inline errors below each field in #F75A5A, 12px

---

### PAGE 3 — Organization Selector

**Route:** `/orgs`
**Layout:** AuthLayout (slightly wider card, max-width 560px)

**What shows:**
- "Your workspaces" heading
- List of organizations the user belongs to:
  ```
  [Org Avatar 40px] [Org Name 15px bold] [Your role badge: OWNER/ADMIN/MEMBER/GUEST]
                     [member count · channel count]          [→ Enter]
  ```
  - Each row: background #1A1C27, hover #22263A, border-bottom #2A2D3E
  - Role badge colors: OWNER=#FFD700, ADMIN=#A78BFA, MEMBER=#60A5FA, GUEST=#6B7280
- Bottom: "+ Create a new workspace" button — outlined, accent blue
- If user has no orgs: illustration (empty state) + "Create your first workspace" CTA

**Behavior:**
- Clicking "Enter" navigates to `/org/:orgId/channels`
- "Create workspace" opens modal (PAGE 3A)

---

### PAGE 3A — Create Organization Modal

**Trigger:** Button on `/orgs`
**Layout:** Modal (centered overlay, backdrop-blur, background #1A1C27)

**What shows:**
- "Create Workspace" title
- Organization Name input (maxlength 80)
- Submit button: "Create workspace"
- Cancel button: outlined

---

### PAGE 4 — App Shell (Main Layout)

**Route:** `/org/:orgId/*`
**Layout:** AppShell

#### 4A — Icon Rail (56px wide, full height, background #111218, border-right #2A2D3E)

```
Top:
  [User Avatar 32px]  ← clicking shows profile popup

Middle (scrollable if many orgs):
  [Org Avatar 36px]   ← current org, active indicator: 3px left bar in #4F6EF7
  [Org Avatar 36px]   ← other orgs, clicking switches context
  [+ icon]            ← create/join org

Bottom:
  [💬 DMs icon]       → /dms
  [⚙️ Settings icon]  → /org/:orgId/settings
  [? Help icon]       → opens help modal
```

- Active org avatar: border 2px #4F6EF7, radius 10px
- Inactive org avatars: border 2px transparent, radius 8px, hover: border #2A2D3E

#### 4B — Org Sidebar (240px wide, background #111218, border-right #2A2D3E)

```
Top (48px):
  [Org Name  16px semibold] [▾ dropdown icon]
  → dropdown items (role-gated):
      Org settings     → OWNER / ADMIN only
      Invite members   → OWNER / ADMIN / (MEMBER if allow_member_invite)
      Leave org        → MEMBER / GUEST / ADMIN only
                         ❌ HIDDEN for OWNER — OWNER must transfer ownership first

Sections (scrollable):

  CHANNELS
  [#] general          → active: bg #22263A, left bar 3px #4F6EF7
  [#] development
  [🔒] private-team    → lock icon for is_private=true
  [+] Add Channel      → shown if can('channel.create') — OWNER/ADMIN or settings allow MEMBER

  DIRECT MESSAGES
  [Avatar] Alice        → green dot if online
  [Avatar] Bob
  [+] New DM

  MEMBERS (collapsible)
  [Avatar] Alice  OWNER  → gold badge
  [Avatar] Bob    ADMIN  → purple badge
  [Avatar] Carol  MEMBER
  [Avatar] Dave   GUEST  → gray badge

Bottom (fixed):
  [Avatar 28px] [Your Name] [⊕ status] — links to /profile
```

- Section headers: 11px / UPPERCASE / #8B91B3 / letter-spacing 0.08em
- Hover on channel item: #22263A background, 0.15s transition
- Active channel: #22263A background, 3px left border #4F6EF7, text #F0F2FF

---

### PAGE 5 — Channel View (Chat + Tasks)

**Route:** `/org/:orgId/channel/:channelId`
**Layout:** AppShell → Main Content area

**Main content splits into two sub-views via tabs:**

```
[💬 Chat] [📋 Tasks] [⚙️ Channel Settings (MANAGER/ADMIN/OWNER only)]
```

#### 5A — Chat Tab

**Top bar (48px, border-bottom #2A2D3E):**
```
[#] channel-name [🔒 Private badge if is_private] | [👥 N members] [🔍 Search] [⋮ More]
```

**Message list (scrollable, fills remaining height):**
```
[Avatar 32px] [Sender name 13px semibold #F0F2FF] [timestamp 11px #4A4F6A]
              [Message text 14px #F0F2FF]
              [Attachment thumbnails if any]
              [Hover actions: 👍 React | ↩ Reply | 📋 Convert to Task | 🗑 Delete]
```
- Deleted messages: `[This message was deleted]` in #4A4F6A italic
- Attachments: image → inline preview (max 320px wide), file → pill with icon + filename + size
- "Convert to Task" button — only shown if can('task.create')
- "Delete" — own message always, any message if can('message.delete.any')
- Date separators: `━━━━━ Today ━━━━━` in #2A2D3E with text #4A4F6A

**Message Input (fixed bottom, padding 16px):**
```
[😊 Emoji] [📎 Attach] [textarea: "Message #channel-name"] [Send →]
```
- textarea: background #1A1C27, border #2A2D3E, focus border #4F6EF7, radius 8px, min-height 44px, max-height 200px auto-expand
- **Channel VIEWER role**: input replaced by gray bar — "You are a viewer in this channel. You cannot send messages."
- **Org GUEST role**: same gray bar — "Guests can only view this channel."
- File attach: opens system file picker, validates MIME + 10MB limit client-side before upload

#### 5B — Tasks Tab (Kanban Board)

**Layout:** Horizontal scroll of board columns (BoardLists)

**Board Column (BoardList):**
```
Width: 280px
Header: [Column Name] [task count] [⋮ → Rename/Delete (MANAGER/ADMIN/OWNER)]
Body: scrollable list of Task Cards
Footer: [+ Add task] → opens inline task create form
```

**Task Card:**
```
Background: #1A1C27, border: 1px solid #2A2D3E, radius: 8px, padding: 12px
[Cover color bar: 4px top, task.cover_color if set]
[Label pills: small colored tags]
[Task title: 14px semibold #F0F2FF, 2 lines max]
[Due date: 📅 Apr 30  | Priority badge: 🔴 HIGH / 🟡 MEDIUM / 🟢 LOW]
[Bottom row: [Assignee avatars stack] [💬 N comments] [📎 N attachments]]
```
- Priority colors: HIGH=#F75A5A, MEDIUM=#F7A84F, LOW=#3DCC91
- Status shown via column position (the column IS the status)
- Drag-and-drop:
  - Requires can('task.edit') or creator privilege
  - Ghost card: semi-transparent copy of card at 70% opacity, follows cursor
  - Source column: card slot shows dashed #2A2D3E placeholder (same height as card)
  - Target column highlight: background shifts to #22263A, border-top 2px #4F6EF7 at drop position
  - No-permission drop: cursor = not-allowed, column does NOT highlight
  - On drop: optimistic UI — card moves instantly, API call fires in background
  - On API error: card snaps back to original position + error toast
- Click card → opens Task Detail Panel (PAGE 6)

**Add Column button** (end of board, MANAGER/ADMIN/OWNER only):
```
[+ Add a list]  — dashed border #2A2D3E, width 180px, centered text
```

---

### PAGE 6 — Task Detail Panel

**Route:** `/org/:orgId/channel/:channelId/task/:taskId`
**Layout:** Right-side drawer (560px wide) sliding over AppShell, OR fullscreen modal on mobile

**Header:**
```
[← Back to board]                              [⋮ More: Delete Task, Copy link]
[Task Title — editable h2 if can('task.edit')] [✕ Close]
```

**Content (scrollable):**

```
SECTION: STATUS & META
[Status dropdown: OPEN / IN_PROGRESS / DONE / CANCELLED]
[Priority dropdown: LOW / MEDIUM / HIGH / CRITICAL]
[Due Date picker]
[Board List (column) selector]
[Cover Color picker — 8 swatches]

SECTION: DESCRIPTION
[Rich text area — editable if can('task.edit')]

SECTION: ASSIGNEES
[Avatar stack] [+ Assign members → picker dropdown]
Each assignee row:
  [Avatar] [Name] [Role badge]
  Permissions: [can_view ✅] [can_edit ⬜] [can_check ⬜] [can_comment ⬜]
  → Toggles shown only to task creator / ADMIN / OWNER

SECTION: LABELS
[Label pill] [Label pill] [+ Add label]
→ Org label picker dropdown

SECTION: CHECKLIST(S)
[Checklist name — editable]  [N/M completed]  [progress bar]
  ☐ Checklist item title     ← tick enabled if: can_check || can_edit || isCreator || ADMIN/OWNER
  ☑ Completed item (strikethrough)
  [+ Add item]               ← shown if: can_edit || isCreator || ADMIN/OWNER
  [✏️ Rename checklist]      ← shown if: can_edit || isCreator || ADMIN/OWNER
  [🗑 Delete checklist]      ← shown if: isCreator || ADMIN/OWNER
[+ Add Checklist]            ← shown if: can_edit || isCreator || ADMIN/OWNER

SECTION: SUBTASKS
  [Flat list of mini task cards — ordered by position]
  Each mini card:
    [Drag handle ⠿] [Title] [Status pill] [Assignee avatars] [Priority dot]

  VISIBILITY RULE (critical — use API `accessible` flag, do NOT guess from assignment):

  IF user has can_view on parent task (or is ADMIN/OWNER):
    → API returns ALL subtasks with `accessible: boolean` per item
    → accessible = isOrgAdmin || isOrgOwner || isAssignedToSubtask

    For subtasks where accessible = true:
        → Normal clickable mini card

    For subtasks where accessible = false:
        → Show card with [🔒 lock icon] + title (dimmed, #4A4F6A)
        → Pointer cursor: default (not pointer, not not-allowed)
        → Hover: show tooltip "You don't have access to this subtask"
        → Click: show toast ONCE (if toast was shown in last 5s for this subtask, do NOT repeat)
        → No drawer opens, no navigation
        WHY not-allowed cursor is wrong: looks broken/error
        WHY toast-only is annoying: repeat clicks spam the UI
        CORRECT PATTERN: tooltip on hover (always visible) + single deduplicated toast on click


    WHY USE THE FLAG (not assignment check):
        ADMIN/OWNER may not be in TaskAssignment but are still accessible=true
        If frontend infers from assignment it will wrongly lock ADMIN/OWNER cards

  ELSE (user has no parent access — direct subtask assignment only):
    → API returns ONLY subtasks where user has can_view=true assignment
    → No accessible flag guessing needed (all returned = accessible)
    → User navigates via direct route: /org/:orgId/task/:subtaskId

  → Click unlocked mini card → opens subtask in same drawer (breadcrumb shown)
  → MAX_SUBTASK_DEPTH = 1: subtask detail view has NO "Add subtask" section

  [+ Add subtask] button
  → Visible only if: can_edit = true | isParentCreator | orgRole in [ADMIN, OWNER]
  → Opens inline form: [Title input] [Add →] [Cancel]
  → On creation: system auto-seeds assignees from parent (shown as greyed note: "Assignments copied from parent task")

  SUBTASK ASSIGNMENT SYNC BANNER (contextual, non-blocking)
  Shown in PARENT task view after parent assignee is added/removed:
  ┌────────────────────────────────────────────────────┐
  │ ℹ Bob was removed from this task.                  │
  │ [Apply to all subtasks]  [Ignore]  [✕]             │
  └────────────────────────────────────────────────────┘
  → background #1A1C27, border-left 3px #4F6EF7, radius 8px
  → Visible to: OWNER | ADMIN | Parent Creator | Subtask Creator only
  → "Apply to all subtasks": shows confirmation first:
    "Some subtasks may have custom assignments that will be overwritten. Continue?"
    [Yes, apply to all]  [Cancel]
    → On confirm: calls POST /tasks/:id/sync-assignments { scope: 'all' }

  SUBTASK DETAIL VIEW (when subtask mini card is clicked):
  → Opens same Task Detail drawer with breadcrumb: [Parent Title] → [Subtask Title]
  → NO "Subtasks" section shown (MAX_SUBTASK_DEPTH = 1)
  → Shows [Sync with parent assignments] button in ASSIGNEES section header:
    [Sync with parent assignments]   ← ghost button, #8B91B3 text
    → Visible if: OWNER | ADMIN | Parent Creator | Subtask Creator
    → On click: confirmation: "This will overwrite this subtask's assignments with the parent's current set. Any custom changes will be lost. Continue?"
    → On confirm: calls POST /tasks/:subtaskId/sync-assignments { scope: 'this' }
    → On success: toast — "Assignments synced from parent task"

SECTION: ATTACHMENTS
[File thumbnail grid]
[+ Upload file — max 10, 10MB each]
→ File rejection errors (inline, shown immediately on file select):
    INVALID_FILE_TYPE: "File type not allowed. Accepted: images, PDF, zip, text, mp4"
    FILE_TOO_LARGE:    "File too large. Maximum size is 10MB."
    LIMIT_EXCEEDED:    "Attachment limit reached (10 max). Remove a file to upload more."
→ Error shown as red text below the upload button, clears on next successful upload

SECTION: COMMENTS (bottom, always scrolled to)
[Avatar] [Name] [timestamp]
         [Comment text]
         [Edit | Delete (own) / Delete (ADMIN/OWNER)]

[Comment input: textarea] [Post →]
→ shown only if can_comment OR creator OR ADMIN/OWNER
```

**Right sidebar within panel (visible on wide screens):**
```
Created by: [Avatar] Name · Apr 20
Created from message: [message preview pill] (if source_message_id set)
Source channel: #channel-name
```

---

### PAGE 7 — Direct Messages

**Route:** `/dms`
**Layout:** AppShell (no org sidebar → replaced by DM conversation list)

**DM List sidebar (240px):**
```
"Direct Messages" heading
[Search input]
[Avatar] Alice   [last message preview] [unread badge]
[Avatar] Bob     [last message preview]
[+ New DM → user picker]
```

**DM Conversation View:**
```
Top bar: [Avatar] [Name] [● Online status]
Message list: same as channel chat, no "Convert to Task" option
Message input: same as channel, no emoji mention of channels
```

---

### PAGE 8 — Organization Settings

**Route:** `/org/:orgId/settings`
**Layout:** AppShell → Main content = Settings panel with left nav

**Permission gate:** Only OWNER or ADMIN can access. MEMBER/GUEST sees 403 page.

**Settings Left Nav (180px):**
```
General
Members
Channels
Labels
Permissions
Audit Log      ← OWNER only
Danger Zone    ← OWNER only
```

#### 8A — General Settings

```
Workspace Name:  [text input] [Save]
Workspace Avatar: [avatar uploader — image only, max 2MB]
```

#### 8B — Members Settings

**Table:**
```
[Avatar] [Name] [Email] [Role badge] [Joined date] [Actions ⋮]
```

Actions (role-gated):
- OWNER: can change any role, remove anyone except self. Remove button shown on all rows.
- ADMIN: can remove MEMBERs and GUESTs only. Remove button **hidden** on OWNER and other ADMIN rows.
- **Removing an ADMIN requires extra confirmation dialog** (critical action):
  "You are removing an admin. This action is logged. Type CONFIRM to proceed."
  → Input field + [Confirm Remove] button
- "Invite member" button (top right) → opens invite modal

**Invite Modal:**
```
"Invite to [Org Name]"
Email input (+ add more)
Role selector: MEMBER / GUEST (ADMIN/OWNER choice)
[Send invite] button
```

**Role Change Dropdown (inline in row):**
```
OWNER only can change roles:
  Any member → ADMIN
  ADMIN → MEMBER
  MEMBER → GUEST
  GUEST → MEMBER

ADMIN CANNOT change roles — ADMIN can only REMOVE MEMBER/GUEST.
(member.role.change capability belongs to OWNER only)
```

Role change always shows confirmation: "Are you sure you want to change [Name]'s role to [NEW_ROLE]?"
For OWNER → transfers require separate "Transfer Ownership" flow in Danger Zone.

#### 8C — Channels Settings

```
Table: [Channel name] [Type: Public/Private] [Members count] [Created by] [Actions]
Actions: Edit name, Delete (with confirmation), Manage members
```

#### 8D — Labels Settings

```
"Organization Labels"
[Color swatch] [Label name] [✏️ Edit] [🗑️ Delete]
[+ Create Label → color picker + name input]
```
Color picker: 12 preset swatches + custom hex input

#### 8E — Permissions Settings

```
"Workspace Permissions"

[ ] Allow members to create channels     (toggle — OrganizationSettings.allow_member_create_channel)
[ ] Allow members to invite people       (toggle — OrganizationSettings.allow_member_invite)
[ ] Unassigned tasks open for editing    (toggle — OrganizationSettings.default_task_open_edit)
```
Each toggle: animated pill switch, #4F6EF7 when ON, #2A2D3E when OFF

#### 8F — Audit Log (OWNER only)

```
Filter bar: [Action type ▾] [Date range] [User ▾]

Table:
[Timestamp] [Actor avatar+name] [Action badge] [Entity] [Details →]

```

Clicking "Details →" expands a row showing metadata JSON (formatted, not raw).

Action badges (complete list):
```
  member.invite         → blue
  member.remove         → red
  member.role.change    → purple
  channel.delete        → red
  channel.member.add    → green (muted)
  channel.member.remove → orange (muted)
  task.create           → blue (muted)
  task.update           → gray
  task.move             → gray (italic)
  task.delete           → orange
  task.bulk_delete      → orange (darker)
  task.assign           → green
  task.assign.sync      → teal (#2DD4BF) — subtask assignment sync
  subtask.create        → blue (muted, indented pill)
  org.delete            → red (critical, bold border)
  settings.update       → gray

Note: task.update + task.move rows are high-frequency → displayed with lighter weight text in table
      All other rows: standard weight
```


#### 8G — Danger Zone (OWNER only)

```
Red-bordered section:

"Transfer Ownership"
  [Select new owner ▾] [Transfer Ownership button]
  → confirmation dialog: type org name + "CONFIRM" to proceed

"Delete Workspace"
  [Delete Workspace button — red, outlined]
  → confirmation dialog: type org name + "CONFIRM" to proceed
  Warning: "This will permanently delete all channels, tasks, and messages."
```

---

### PAGE 9 — Channel Settings

**Route:** `/org/:orgId/channel/:channelId/settings`
**Layout:** Modal or right panel (accessed via ⚙️ tab in channel view)
**Permission gate:** MANAGER, ADMIN, OWNER only

```
"Channel Settings"

Channel Name: [input] [Save]
Privacy:      [Public ○] [Private ●]   (toggle — is_private)
              Warning if switching to private: "Members without explicit access will lose access."

CHANNEL MEMBERS
[Avatar] [Name] [Role: MANAGER/CONTRIBUTOR/VIEWER] [Change role ▾] [Remove ×]
[+ Add member → org member picker]

Role change in channel:
  MANAGER → CONTRIBUTOR / VIEWER
  CONTRIBUTOR → MANAGER / VIEWER
  VIEWER → MANAGER / CONTRIBUTOR

[Delete Channel] — red button at bottom, requires confirmation
```

---

### PAGE 10 — User Profile & Settings

**Route:** `/profile`
**Layout:** AppShell → modal or page overlay

```
"Your Profile"

[Avatar upload: 96px circle, hover shows camera icon overlay]
Full Name: [input] [Save]
Email: [read-only — email change flow TBD]

"Change Password"
  Current password
  New password
  Confirm new password
  [Update Password]

"Notification Preferences" — (future, placeholder section shown)

[Sign out — red text button at bottom]
```

---

### PAGE 11 — 403 Forbidden

**Route:** Any protected route a user lacks permission for
**Layout:** AppShell (sidebar still visible)

```
Center of main content:

[Shield icon — 64px, #F75A5A]
"Access Denied"  — 28px bold
"You don't have permission to view this page."  — #8B91B3
[← Go back] button  — outlined
[Go to Home →] link → org home channel
```

---

### PAGE 12 — 404 Not Found

**Route:** Any unmatched route
**Layout:** AuthLayout (full page, no sidebar)

```
[404 in huge text — 120px, #2A2D3E]
"Page not found"  — 22px semibold
"The page you're looking for doesn't exist or was deleted." — #8B91B3
[← Back to app] button → /orgs
```

---

### PAGE 13 — Rate Limit Screen (Client-side)

**Trigger:** 429 response from API
**Layout:** Toast + inline block (not full page)

**Toast (top-right, 320px):**
```
⚠️  [amber background, border-left 3px #F7A84F]
"Slow down a bit!"
"Too many requests. Try again in 60s."
[countdown progress bar — reads Retry-After header value]
```

### PAGE 14 — System Limit Error (Client-side)

**Trigger:** 422 LIMIT_EXCEEDED response from API
**Layout:** Toast (non-blocking) + inline error text near the action that failed

```
Toast:
  ⛔ [red background, border-left 3px #F75A5A]
  "[Resource] limit reached"
  "[error message from API, e.g. 'Channel limit reached (100 max).']"

Examples by context:
  Channel creation blocked: toast + "+ Add Channel" button shows tooltip on hover:
    "Channel limit reached. Archive or delete channels to create more."

  Member invite blocked: toast:
    "Member limit reached (500 max). Upgrade plan or remove inactive members."

  Subtask depth blocked: toast:
    "Subtasks cannot have their own subtasks. Max depth is 1."

  Attachment limit blocked: inline under upload button:
    "Attachment limit reached (10 max). Remove a file to upload more."
```

### PAGE 15 — Session Expired (Client-side)

**Trigger:** TOKEN_REVOKED or ROLES_STALE 401 → Axios silently refreshes → if refresh fails → logout
**Layout:** Toast (brief) → redirect to /login

```
If silent refresh SUCCEEDS (common case — role changed):
  → User sees nothing. Request retried automatically.

If silent refresh FAILS (refresh token expired or revoked):
  → Toast (error type, 5s):
    "Your session has expired. Please sign in again."
  → After 1.5s delay → redirect to /login
  → /login URL includes ?reason=session_expired
  → Login page shows amber banner: "You were signed out. Please sign in again."
```

---

### PAGE 16 — Direct Subtask Access (assigned-only users)

**Route:** `/org/:orgId/task/:subtaskId`
**Layout:** AppShell → Task Detail drawer/fullscreen (same as PAGE 6)
**Access:** User has can_view on this subtask but may NOT have parent task access

```
Who reaches this route:
  → Users assigned to the subtask but NOT the parent task
  → Links shared directly to a subtask (e.g. from notifications, DMs)

Breadcrumb behavior:
  IF user has can_view on parent:
    [Parent Task Title (clickable)] → [Subtask Title]
    → Clicking parent title opens parent task (PAGE 6)

  IF user has NO parent access:
    [Parent Task Title (dimmed, NOT clickable)] → [Subtask Title]
    → No navigation on parent breadcrumb
    → Tooltip: "You don't have access to the parent task"

Content shown:
  → Full subtask detail (status, priority, description, assignees, comments, attachments)
  → NO subtasks section (MAX_SUBTASK_DEPTH = 1)
  → ASSIGNEES section shows [Sync with parent assignments] if authorized

Permission gate:
  → If user has NO can_view on this subtask AND is not ADMIN/OWNER → redirect to /403

Back button:
  IF has parent access: [← Back to parent task] → opens parent task detail
  ELSE:                 [← Back to Home] → navigates to org home
```

---

---

## Global UI Components

### Sidebar Channel Item States

```
Default:   text #8B91B3, no background
Hover:     background #22263A, text #F0F2FF, transition 0.15s
Active:    background #22263A, left border 3px #4F6EF7, text #F0F2FF
Unread:    bold text + white dot badge (right side)
```

### Button Variants

```
Primary:   bg #4F6EF7, text white, hover bg #6B86FF, radius 8px, height 36px
Danger:    bg #F75A5A, text white, hover bg #FF7070
Outlined:  border #2A2D3E, text #F0F2FF, hover border #4F6EF7
Ghost:     no border, no bg, text #8B91B3, hover text #F0F2FF, hover bg #22263A
Icon:      36×36px, radius 8px, ghost styling
```

### Input Field Styling

```
Background:   #0A0B0F
Border:       1px solid #2A2D3E
Border-focus: 1px solid #4F6EF7 + focus ring (0 0 0 2px rgba(79,110,247,0.3))
Text:         #F0F2FF
Placeholder:  #4A4F6A
Radius:       8px
Height:       40px (single line)
Padding:      0 12px
```

### Badge / Role Pill

```
OWNER:       bg rgba(255,215,0,0.15),   text #FFD700, border 1px rgba(255,215,0,0.3)
ADMIN:       bg rgba(167,139,250,0.15), text #A78BFA, border 1px rgba(167,139,250,0.3)
MEMBER:      bg rgba(96,165,250,0.15),  text #60A5FA, border 1px rgba(96,165,250,0.3)
GUEST:       bg rgba(107,114,128,0.15), text #9CA3AF, border 1px rgba(107,114,128,0.3)
MANAGER:     bg rgba(52,211,153,0.15),  text #34D399, border 1px rgba(52,211,153,0.3)
CONTRIBUTOR: bg rgba(96,165,250,0.15),  text #60A5FA, border 1px rgba(96,165,250,0.3)
VIEWER:      bg rgba(107,114,128,0.15), text #9CA3AF, border 1px rgba(107,114,128,0.3)
```
All pills: 10px font, 6px uppercase letter-spacing, radius 100px, padding 2px 8px

### Modal

```
Backdrop: rgba(0,0,0,0.7) + backdrop-blur(4px)
Container: bg #1A1C27, border 1px #2A2D3E, radius 12px, shadow (modal shadow above)
Header: title 17px semibold + [✕] close button top-right
Body: padding 24px
Footer: border-top #2A2D3E, padding 16px 24px, actions right-aligned
```

### Toast Notifications

```
Position:  top-right, 16px from edges, stacked
Width:     320px
Radius:    8px
Duration:  4s auto-dismiss with slide-out animation
Types:
  success: border-left 3px #3DCC91, icon ✓
  error:   border-left 3px #F75A5A, icon ✕
  warning: border-left 3px #F7A84F, icon ⚠
  info:    border-left 3px #4F6EF7, icon ℹ
```

### Empty States

```
Illustration: SVG icon, 80px, #2A2D3E color
Heading: 17px semibold, #F0F2FF
Body:    14px, #8B91B3
CTA:     Primary button below
```

---

## Route Map (Complete)

```
/login                                         → Login page
/register                                      → Register page
/orgs                                          → Org selector
/org/:orgId/channel/:channelId                 → Channel view (Chat + Tasks tabs)
/org/:orgId/channel/:channelId/task/:taskId    → Task detail panel
/org/:orgId/settings                           → Org settings
/org/:orgId/settings/members                   → Members tab
/org/:orgId/settings/channels                  → Channels tab
/org/:orgId/settings/labels                    → Labels tab
/org/:orgId/settings/permissions               → Permissions tab
/org/:orgId/settings/audit-log                 → Audit log (OWNER only)
/org/:orgId/settings/danger                    → Danger zone (OWNER only)
/org/:orgId/channel/:channelId/settings        → Channel settings
/dms                                           → Direct messages home
/dms/:conversationId                           → DM conversation
/profile                                       → User profile
/403                                           → Forbidden
/404                                           → Not found
```

---

## Permission-Gated UI Rules

```
Sidebar "Add Channel" button:
  → visible if: orgRole === OWNER | ADMIN | (MEMBER && allow_member_create_channel)

Sidebar "Invite members" dropdown item:
  → visible if: orgRole === OWNER | ADMIN | (MEMBER && allow_member_invite)

Sidebar "Leave org" dropdown item:
  → HIDDEN for OWNER (must transfer ownership first — Danger Zone)
  → visible for: ADMIN | MEMBER | GUEST

Channel "⚙ Settings" tab:
  → visible if: channelRole === MANAGER | orgRole === ADMIN | orgRole === OWNER

Board "+ Add a list" button:
  → visible if: channelRole === MANAGER | orgRole === ADMIN | orgRole === OWNER

Task card drag handle:
  → active if: can_edit || isCreator || orgRole in [ADMIN, OWNER]

Task "[+ Add task]" in board column footer:
  → visible if: channelRole in [MANAGER, CONTRIBUTOR] | orgRole in [ADMIN, OWNER]
  → hidden for: VIEWER | GUEST

Task "Delete" option:
  → visible if: isCreator || orgRole in [ADMIN, OWNER]

Task "Assign members" [+] button:
  → visible if: isCreator || orgRole in [ADMIN, OWNER]

Task "[+ Add subtask]" button:
  → visible if: can_edit || isParentCreator || orgRole in [ADMIN, OWNER]

Checklist tick (☐ → ☑):
  → enabled if: can_check || can_edit || isCreator || orgRole in [ADMIN, OWNER]
  → grayed out / non-interactive for can_view only users

Comment input box:
  → visible if: can_comment || isCreator || orgRole in [ADMIN, OWNER]

Comment "Edit" button:
  → visible if: isOwnComment && (can_comment || isCreator || orgRole in [ADMIN, OWNER])

Comment "Delete" button:
  → own comment: visible if can_comment || isCreator
  → any comment: visible if orgRole in [ADMIN, OWNER]

Message "Delete" (any):
  → visible if: channelRole === MANAGER | orgRole in [ADMIN, OWNER]

Org Settings page:
  → accessible if: orgRole in [ADMIN, OWNER]

Audit Log tab:
  → accessible if: orgRole === OWNER only

Danger Zone tab:
  → accessible if: orgRole === OWNER only

Members table — Remove button:
  → hidden on OWNER row always
  → hidden on ADMIN rows when viewer is ADMIN (ADMIN cannot remove ADMIN)
  → removing an ADMIN requires extra "CONFIRM" input dialog

Members table — Role change dropdown:
  → hidden entirely when viewer is ADMIN (ADMIN cannot change roles)
  → visible only to OWNER

[Sync with parent assignments] button (subtask detail):
  → visible if: orgRole in [ADMIN, OWNER] | isParentCreator | isSubtaskCreator
  → hidden for: can_edit only | can_view only

Channel Privacy toggle (is_private):
  → editable by: MANAGER | ADMIN | OWNER
  → warning banner shown when switching to private
```

---

## Micro-animations

```
Sidebar channel item: left border slides in (width 0→3px, 0.15s ease)
Card hover lift:       transform: translateY(-1px) + shadow intensifies, 0.15s
Modal open:            scale(0.96)→scale(1) + opacity 0→1, 0.2s cubic-bezier
Toast enter:           translateX(100%)→translateX(0), 0.25s ease-out
Toast exit:            translateX(0)→translateX(110%), 0.2s ease-in
Button press:          scale(0.97), 0.1s
Toggle switch:         thumb slides with cubic-bezier spring, 0.2s
Kanban drag:           card scales to 1.02, shadow intensifies, cursor grabbing
Tab underline:         slides to active tab, 0.2s ease
Dropdown open:         translateY(-4px)→translateY(0) + opacity, 0.15s
```

---

## Loading States

```
SKELETON LOADERS (use animated shimmer: background gradient left→right, 1.5s loop)

Channel list sidebar:
  3–4 skeleton rows: [circle 32px] [rect 120px] stacked, #1A1C27 base

Kanban board:
  2–3 columns, each with 3–4 skeleton task cards
  Card skeleton: rect full-width, heights 80px, #1A1C27 base, radius 8px

Task detail panel opening:
  Header: rect 240px + rect 80px
  Sections: 4–5 rect blocks of varying widths
  Shimmer overlaid on #1A1C27

Message list:
  6–8 rows: [circle 32px] + [rect 200px] + [rect 120px] staggered widths
  Left-aligned, gap 12px between rows

Org member list (settings):
  5–6 skeleton rows: [circle 36px] [rect 140px] [rect 60px] [rect 40px]

Initial page load (full app):
  Full-screen pulse on #111218 for max 1.5s
  Then shell fades in + sidebar skeletons appear
  Replace with real data as API responses arrive
```

---

## Specific Empty States

```
Each empty state: centered in available space, icon 64px #2A2D3E, heading + body + optional CTA

CHANNEL — No messages yet:
  Icon: chat bubble
  Heading: "No messages yet"
  Body: "Be the first to say something in #channel-name"
  CTA: none (message input is always visible below)

KANBAN BOARD — No tasks in column:
  Inside column body:
  Icon: checkmark circle (small, 32px)
  Text: "No tasks" in #4A4F6A
  CTA: [+ Add task] (same as footer button)

KANBAN BOARD — Board has no columns:
  Center of board area:
  Icon: grid icon 64px
  Heading: "No lists yet"
  Body: "Create your first board list to start organizing tasks"
  CTA: [+ Add a list] → shown only if MANAGER/ADMIN/OWNER

TASK DETAIL — No subtasks:
  Inside subtask section:
  Text: "No subtasks" in #4A4F6A, 13px
  CTA: [+ Add subtask] (if permitted)

TASK DETAIL — No comments:
  Above comment input:
  Icon: speech bubble 40px
  Text: "No comments yet" in #4A4F6A

TASK DETAIL — No attachments:
  Inside attachment section:
  Icon: paperclip 40px
  Text: "No attachments" in #4A4F6A

CHANNEL SETTINGS — No members:
  Icon: person icon 48px
  Heading: "No members in this channel"
  CTA: [+ Add member] → shown only to MANAGER/ADMIN/OWNER

DIRECT MESSAGES — No conversations:
  Icon: DM icon 64px
  Heading: "No direct messages"
  Body: "Start a conversation with a teammate"
  CTA: [+ New DM]

ORGANIZATION SELECTOR — No orgs:
  Already defined (illustration + "Create your first workspace")
```

---

## Optimistic UI Rules

```
ALL MUTATIONS are optimistic. UI updates immediately, API fires in background.
On API error: revert to previous state + show error toast.

Rules by action:

  SEND MESSAGE
    → Append message to list immediately with pending state (text slightly dimmed, no timestamp)
    → On success: show timestamp, remove pending state
    → On error: mark message as failed [⚠ Retry | Remove]

  MOVE TASK (drag-drop column change)
    → Card moves immediately to target column
    → On error: card snaps back + toast: "Failed to move task"

  CREATE TASK (inline form)
    → Add skeleton card at bottom of column immediately
    → Replace with real card on success
    → On error: remove skeleton + toast: "Failed to create task"

  ADD SUBTASK
    → Add mini card immediately with title + pending indicator
    → On error: remove + toast

  TICK CHECKLIST ITEM
    → Toggle ☐↔☑ immediately
    → On error: revert + toast

  SEND REACTION
    → Increment count immediately
    → On error: revert silently

  ASSIGN/UNASSIGN MEMBER
    → Update avatar stack immediately
    → On error: revert + toast

  DELETE TASK
    → Remove card immediately
    → On error: re-insert card + toast

  All rollbacks: smooth (200ms fade-back animation, not jarring)
```

---

## Keyboard Shortcuts

```
GLOBAL
  Cmd/Ctrl + K       → Open search / command palette
  Esc                → Close modal, drawer, or dropdown (in that priority order)
  Cmd/Ctrl + /       → Show keyboard shortcut help modal

MESSAGE INPUT (when textarea focused)
  Enter              → Send message
  Shift + Enter      → New line (do NOT send)
  Esc                → Clear input / cancel edit mode
  Arrow Up           → Edit last sent message (if input is empty)

TASK DETAIL
  Cmd/Ctrl + Enter   → Save task title when editing
  Esc                → Cancel edit, close drawer
  Tab                → Move focus between sections

KANBAN BOARD
  N                  → Create new task in focused column (if permitted)

SIDEBAR NAVIGATION
  Alt + Up/Down      → Move between channels
```

---

## Responsive Behavior

```
Breakpoints:
  Desktop:  ≥1280px → full 3-column AppShell (icon rail + sidebar + content)
  Tablet:   768px–1279px → icon rail hidden, sidebar collapsible (hamburger ☰)
  Mobile:   <768px → single-column layout

DESKTOP (≥1280px):
  Full AppShell as designed
  Task detail: right-side drawer (560px)
  Kanban board: horizontal scroll

TABLET (768–1279px):
  Icon rail: hidden
  Org sidebar: collapsed by default, toggle via hamburger [☰] top-left
  When sidebar open: overlays content (not pushes)
  Task detail: fullscreen modal (100vw)
  Kanban board: horizontal scroll preserved

MOBILE (<768px):
  Icon rail: hidden
  Org sidebar: hidden, accessible via [☰] hamburger
  Main content: full screen
  Task detail: fullscreen panel (100vh, slides up from bottom)
  Kanban board: vertical scroll (columns stack vertically, full width)
  Message input: fixed bottom, no shrink
  DM list: full screen → tap conversation → replaces list

Touch behavior:
  Task drag-drop: touch events supported (same ghost + drop zone)
  Swipe left on message: reveal delete/react actions
  Swipe down on modal: close modal
```

---

*Generated from: ROLE_MANAGEMENT_PLAN.md · ROLE_PERMISSIONS.md · PRODUCTION_HARDENING.md · base.prisma · chat.prisma · tasks.prisma*
*For Stitch or any UI generation tool — pass each page section individually.*
