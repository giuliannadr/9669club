# Stage 1: Build
FROM node:20-alpine AS builder
RUN npm install -g pnpm@9
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/admin-dashboard/package.json ./apps/admin-dashboard/
COPY packages/shared/api-client/package.json ./packages/shared/api-client/
COPY packages/shared/types/package.json ./packages/shared/types/
RUN pnpm install
COPY . .
RUN pnpm --filter admin-dashboard build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/apps/admin-dashboard/dist /usr/share/nginx/html
# COPY apps/admin-dashboard/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
