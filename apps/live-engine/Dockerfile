# Stage 1: Build
FROM node:20-alpine AS builder
RUN npm install -g pnpm@9
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/live-engine/package.json ./apps/live-engine/
COPY packages/shared/api-client/package.json ./packages/shared/api-client/
COPY packages/shared/types/package.json ./packages/shared/types/
RUN pnpm install
COPY . .
RUN pnpm --filter live-engine build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/apps/live-engine/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
