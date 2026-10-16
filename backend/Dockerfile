# ==============================================================================
# Multi-stage Production Dockerfile for ResQGrid Backend
# ==============================================================================

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json ./

# Install all dependencies for TypeScript compilation
RUN npm install

# Copy source and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript to dist
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Lightweight Production Runner
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

# Install wget for container health checks
RUN apk add --no-cache wget

# Install only production dependencies
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Security: Run as non-root user
USER node

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health/live || exit 1

CMD ["node", "dist/server.js"]
