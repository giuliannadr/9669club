# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN npm install -g pnpm@9
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/web-portfolio/package.json ./apps/web-portfolio/
COPY packages/shared/api-client/package.json ./packages/shared/api-client/
COPY packages/shared/types/package.json ./packages/shared/types/
RUN pnpm install && mkdir -p /app/node_modules

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN npm install -g pnpm@9
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter web-portfolio build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web-portfolio/public ./apps/web-portfolio/public
COPY --from=builder /app/apps/web-portfolio/.next/standalone ./
COPY --from=builder /app/apps/web-portfolio/.next/static ./apps/web-portfolio/.next/static
EXPOSE 3000
CMD ["node", "apps/web-portfolio/server.js"]
