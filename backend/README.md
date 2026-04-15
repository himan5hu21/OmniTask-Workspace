# Synkro Backend Setup

## Overview
This is the backend API for Synkro Enterprise Hub - a collaborative workspace with task management and real-time chat features.

## Technology Stack
- **Framework**: Fastify (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **Real-time**: Socket.io
- **Validation**: Zod
- **Language**: TypeScript

## Setup Instructions

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Configuration
Copy `.env` file and update with your values:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/synkro_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# CORS
CLIENT_URL="http://localhost:3001"

# Socket.io
SOCKET_CORS_ORIGIN="http://localhost:3001"
```

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations (when ready)
npx prisma db push

# View database in Prisma Studio
npx prisma studio
```

### 4. Start Development Server
```bash
pnpm dev
```

## API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - User registration
- `POST /login` - User login

### Organizations (`/api/v1`)
- `POST /organizations` - Create organization
- `GET /organizations` - Get user's organizations
- `POST /channels` - Create channel
- `POST /channels/members` - Add member to channel
- `GET /organizations/:orgId/channels` - Get organization channels

### Tasks (`/api/v1`)
- `POST /tasks` - Create task
- `POST /subtasks` - Create subtask
- `POST /subtasks/assign` - Assign subtask to user
- `PATCH /subtasks/:id/toggle` - Toggle subtask completion
- `GET /channels/:channelId/tasks` - Get channel tasks

## Database Schema

### Core Models
- **User**: User accounts with roles and permissions
- **Organization**: Top-level organization entities
- **Channel**: Team channels within organizations
- **ChannelMember**: User-channel relationships with roles

### Task Models
- **Task**: Main task headers (like Google Keep notes)
- **SubTask**: Nested checkbox items
- **TaskAssignment**: User permissions for specific subtasks

### Chat Models
- **ChannelMessage**: Channel-based messages
- **DirectConversation**: 1-on-1 chat conversations
- **DirectMessage**: Private messages between users

## Role-Based Access Control

### User Roles
- **Organization Admin**: Full control over all channels and tasks
- **Channel Manager**: Admin rights within specific channels
- **Channel Member**: Limited to own tasks unless assigned

### Task Permissions
- **VIEW_ONLY**: Can only view the task
- **CHECK_ONLY**: Can view and check/uncheck the task
- **EDIT_ALLOWED**: Can view, check, and edit the task content

## Development Notes

### Socket.io Events
The server supports real-time communication for:
- Channel chat messages
- Direct messages
- Live task updates
- User presence

### Authentication Flow
1. User registers/logs in via JWT
2. Token included in Authorization header
3. Middleware validates token and attaches user info
4. Role-based permissions enforced per endpoint

### Error Handling
All endpoints use consistent error responses:
```json
{
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

## Next Steps

1. **Complete Prisma Setup**: Generate client and run migrations
2. **Add JWT Middleware**: Implement authentication validation
3. **Enhance Socket.io**: Add room-based messaging
4. **Add Tests**: Unit and integration tests
5. **Add Logging**: Structured logging for monitoring
6. **Add Rate Limiting**: Prevent API abuse
7. **Add Input Sanitization**: Security hardening
