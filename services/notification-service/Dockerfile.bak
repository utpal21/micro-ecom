# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace configuration and shared packages
COPY pnpm-workspace.yaml ./
COPY packages/ ./packages/

# Copy package files
COPY package*.json pnpm-lock.yaml* ./

# Install pnpm directly (more reliable than corepack for network issues)
RUN npm install -g pnpm@latest --registry=https://registry.npmjs.org/ --fetch-timeout=180000

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript (build shared packages first, then notification-service)
RUN pnpm --filter @emp/notification-service build --noEmit
RUN pnpm --filter @emp/notification-service build

# Production stage
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S notification && \
    adduser -S -u 1001 -G notification notification

WORKDIR /app

# Copy workspace configuration and packages
COPY pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY package*.json pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm@latest --registry=https://registry.npmjs.org/ --fetch-timeout=180000

# Copy notification-service package.json
COPY services/notification-service/package.json ./

# Install dependencies using pnpm with workspace support
RUN pnpm install --no-frozen-lockfile

# Copy built application from builder stage
COPY --from=builder --chown=notification:notification /app/services/notification-service/dist ./dist
COPY --from=builder --chown=notification:notification /app/services/notification-service/openapi.yaml ./openapi.yaml

# Switch to non-root user
USER notification

# Expose port
EXPOSE 8006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8006/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]