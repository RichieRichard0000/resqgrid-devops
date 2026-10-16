# ==============================================================================
# Multi-stage Production Dockerfile for ResQGrid Backend
# Context: Root monorepo directory
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY backend/package.json ./backend/

WORKDIR /app/backend
RUN npm install

# Copy configuration and TypeScript source
COPY backend/tsconfig.json ./
COPY backend/src/ ./src/

# Compile TypeScript
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runner
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Install wget for container health checks
RUN apk add --no-cache wget

# Install only production dependencies
COPY backend/package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled artifacts
COPY --from=builder /app/backend/dist ./dist

# Copy database schema migrations and seed scripts
COPY database/ ./database/

# Security: Run as unprivileged node user
USER node

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health/live || exit 1

CMD ["node", "dist/server.js"]
