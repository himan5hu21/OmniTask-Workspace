# 1. Base Image Node 20 (LTS)
FROM node:20-alpine

# 2. Prisma mate OpenSSL install karvu jaruri che (Alpine ma default nathi hotu)
RUN apk add --no-cache openssl

# 3. Working Directory set karo
WORKDIR /app

# 4. pnpm enable karo (package.json na packageManager field pramane)
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# 5. Dependency files copy karo
COPY package.json pnpm-lock.yaml* ./

# 6. Dependencies install karo
RUN pnpm install

# 7. Aakho code copy karo
COPY . .

# 8. Port expose karo
EXPOSE 8000

# 9. Default command (docker-compose mathi aane override karishu)
CMD ["pnpm", "run", "dev"]