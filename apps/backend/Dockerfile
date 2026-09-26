# 1. Base Image Node 22 (LTS)
FROM node:22-alpine

# 2. Prisma OpenSSL requirement
RUN apk add --no-cache openssl

# 3. Working Directory
WORKDIR /app

# 4. Enable pnpm
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

# 5. Copy workspace manifests
COPY package.json pnpm-workspace.yaml* pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# 6. Install backend dependencies (with workspace deps)
RUN pnpm install --filter omnitask-backend...

# 7. Copy packages and backend source code
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# 8. Set working directory to backend
WORKDIR /app/apps/backend

# 9. Generate Prisma client & Build
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" pnpm run build

# 10. Expose port
EXPOSE 8000

# 11. Start server
CMD ["pnpm", "start"]