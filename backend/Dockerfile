# 1. Base Image Node 22 (LTS)
FROM node:22-alpine

# 2. Prisma mate OpenSSL install karvu jaruri che (Alpine ma default nathi hotu)
RUN apk add --no-cache openssl

# 3. Working Directory set karo
WORKDIR /app

# 4. pnpm enable karo (package.json na packageManager field pramane)
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

# 5. Dependency files copy karo
COPY package.json pnpm-workspace.yaml* pnpm-lock.yaml* ./

# 6. Dependencies install karo
RUN pnpm install

# 7. Aakho code copy karo
COPY . .

# 8. Generate Prisma client & Compile Typescript code
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" pnpm run build

# 9. Port expose karo
EXPOSE 8000

# 10. Start production server
CMD ["pnpm", "start"]