# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm matching the workspace lockfile
RUN npm install -g pnpm@10.8.0

# Copy monorepo root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages

# Copy service package files
COPY services/order-service/package.json ./

# Install dependencies (will install workspace packages)
RUN pnpm install

# Build workspace packages first
RUN pnpm --filter @emp/shared-types build
RUN pnpm --filter @emp/utils build
RUN pnpm --filter @emp/event-bus build

# Copy source code and config
COPY services/order-service/src ./src
COPY services/order-service/tsconfig.json ./
COPY services/order-service/nest-cli.json ./

# Build application
RUN pnpm build

# Stage 2: Production
FROM node:22-alpine AS production

# Install dumb-init and wget for health check
RUN apk add --no-cache dumb-init wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy package files
COPY services/order-service/package.json ./
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages

# Install pnpm matching the workspace lockfile
RUN npm install -g pnpm@10.8.0

# Install production dependencies only
RUN pnpm install --prod

# Copy built application and node_modules from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER nestjs

EXPOSE 8003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8003/health/live || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main"]
