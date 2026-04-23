# Socket.io Architecture: OmniTask Workspace

This document explains how the real-time communication system works across the frontend and backend.

## 1. Backend: The Server (Fastify + Socket.io)

### Registration & Access
- **File**: `backend/src/plugins/socket.ts`
- The `socketPlugin` initializes a new `Server` instance using the same HTTP server Fastify is running on.
- It uses `fastify.decorate('io', io)` to make the socket instance available globally via `app.io`.

### Connection Lifecycle
- When a user connects (`io.on('connection')`), they are assigned a unique `socket.id`.
- The backend listens for specific events like `channel:join` or `channel:leave`.

### Room Management
The system uses **Rooms** to isolate messages. A user shouldn't see messages from a channel they aren't looking at.
- **Join**: When the backend receives `channel:join`, it calls `socket.join(\`channel:${channelId}\`)`.
- **Leave**: When it receives `channel:leave`, it calls `socket.leave(\`channel:${channelId}\`)`.

### Emitting Events
When a new message is saved to the database in `MessageService.ts`:
```typescript
if (io) {
  io.to(`channel:${channelId}`).emit('channel:message_created', messageData);
}
```
This sends the message **only** to users currently in that specific channel's room.

---

## 2. Frontend: The Client (Next.js + Socket.io-client)

### Client Instance
- **File**: `frontend/src/lib/socket.ts`
- Uses a singleton pattern (`getSocket()`) to ensure only one socket connection is active at a time.
- Configured with `withCredentials: true` to allow session handling.

### Lifecycle in Components
- **File**: `frontend/src/app/(app)/(organizations)/organizations/[id]/channels/[channelId]/page.tsx`
- **Mounting**: When you open a channel, a `useEffect` runs:
  ```typescript
  const socket = joinChannelRoom(channelId, user.id);
  ```
- **Listening**: The component then listens for events:
  ```typescript
  socket.on('channel:message_created', (data) => {
    setSocketMessages(prev => [...prev, data]);
  });
  ```
- **Unmounting**: When you switch channels or close the tab, the cleanup function runs:
  ```typescript
  return () => {
    leaveChannelRoom(channelId, user.id);
    socket.off('channel:message_created');
  };
  ```

---

## 3. The Full Flow: Sending a Message

1.  **Frontend**: You type a message and hit "Send".
2.  **API Call**: The frontend sends an HTTP `POST` request to `/api/v1/channels/:id/messages`.
3.  **Backend Controller**: Receives the request and calls `MessageService.createMessage`.
4.  **Database**: The message is saved to the PostgreSQL database.
5.  **Backend Broadcast**: After a successful save, the backend uses the `io` instance to broadcast the `channel:message_created` event to the specific channel room.
6.  **Socket Connection**: The event travels through the active WebSocket connection.
7.  **Frontend Update**: The channel page receives the event, takes the new message data, and adds it to the `socketMessages` state, making it appear instantly on the screen without a page refresh.

---

## 4. Key Security & Performance
- **Isolation**: By using `socket.join(\`channel:${id}\`)`, we prevent data leakage between different channels.
- **Cleanup**: Always removing listeners (`socket.off`) and leaving rooms prevents memory leaks and multiple duplicate message triggers.
