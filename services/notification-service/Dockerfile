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

# Build TypeScript
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S notification && \
    adduser -S -u 1001 -G notification notification

WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml* ./

# Install pnpm directly and production dependencies only
RUN npm install -g pnpm@latest --registry=https://registry.npmjs.org/ --fetch-timeout=180000 && \
    pnpm install --prod --no-frozen-lockfile

# Copy built application from builder stage
COPY --from=builder --chown=notification:notification /app/dist ./dist

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