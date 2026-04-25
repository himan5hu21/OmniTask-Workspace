# OmniTask — Socket & Role Integration Planning (v3 FINAL)

This document defines how the Socket.io architecture integrates with the **Role Management System (v3)** and **Frontend Design** to ensure secure, real-time updates.

## 1. Socket Authentication & Guarding

### 1.1 Connection Authentication
- **Middleware**: Every socket connection must pass a JWT verification using `fastify.jwt`.
- **Identity Storage**: Upon successful connection, the socket instance stores `userId`, `name`, `tokenVersion`, and `is_superadmin`.
- **Validation**: 
  - Check `tokenVersion` in the JWT against the current `token_version` in the DB.
  - If they mismatch → `socket.disconnect(true)` immediately.

### 1.2 Room Authorization (`io.on('join')`)
Users cannot join rooms arbitrarily. Joining a room requires a permission check:

| Room Type | Required Permission / Role |
|-----------|---------------------------|
| `user:{userId}` | Current user's own ID only. |
| `org:{orgId}` | Must be in `OrganizationMember`. |
| `channel:{channelId}` | Must be in `ChannelMember` OR be Org `OWNER`/`ADMIN`. |
| `task:{taskId}` | **(MANDATORY) MUST be Channel Member** AND (have `can_view` flag OR be Task Creator OR Org `OWNER`/`ADMIN`). |

---

## 2. Room Hierarchy & Presence

### 2.1 Presence Tracking
To support the **Online Status Indicators** (#3DCC91 dots) in the sidebar:
- **`on:connection`**: Emit `presence:online` to all `org:${orgId}` rooms the user belongs to.
- **`on:disconnect`**: Emit `presence:offline` to the same rooms.

### 2.2 Room Scopes & Separation (Anti-Exposure)
- **Org Room (`org:${orgId}`)**: **SAFE EVENTS ONLY**.
  - Presence updates.
  - Member added/removed (user IDs only).
  - Role changes.
  - *Never* emit channel names or task titles to this room if the channel is private.
- **Channel Room (`channel:${channelId}`)**: Channel-specific updates.
  - Message creation/deletion.
  - Task creation/movement on board.
  - General task metadata changes.
- **Task Room (`task:${taskId}`)**: **High-Frequency Details Only**.
  - Comment updates.
  - Checklist item toggling.
  - Real-time description editing.

---

## 3. Real-Time Revalidation Logic

### 3.1 Ghosting Prevention
- When a user is removed from an organization or channel (`member.remove`), the backend MUST immediately find all active sockets for that user and call `socket.leave(room)`.

### 3.2 Dynamic Room Revalidation (New)
- **Trigger**: Any change in `OrganizationMember.role` or `ChannelMember.role` that *doesn't* trigger a `token_version` increment.
- **Logic**: 
  1. Find user's active sockets.
  2. For each socket, check its joined rooms.
  3. **Batch Check Permissions**: Group rooms by type (e.g., all joined channels, all joined tasks) and perform a single bulk query per type instead of checking each room individually (prevents N+1 database pressure).
  4. Re-run `Room Authorization` checks using the batched data.
  5. If check fails → `socket.leave(room)`.

---

## 4. Rate Limiting & Performance

### 4.1 Server-Side Rate Limits
- **Typing Events**: Max 1 emit per 2 seconds per user per channel.
- **Message Senders**: Max 60 messages per minute per user (synchronized with HTTP limit).
- **Task Updates**: Max 100 updates per minute per user.

### 4.2 Client-Side Debouncing
- All high-frequency updates (e.g., typing, description changes) MUST be debounced (minimum 300ms) on the client before emitting to the socket.

---

## 5. Security Strategy

- **Payload Minimization**: Prefer emitting `ids` and `timestamps` over large objects. Let the client's cache (React Query/Redux) handle the data fetching if needed.
- **Audit Logs**: Critical socket events (like joining a sensitive task room) should be logged to the `AuditLog` if they fail authorization.
