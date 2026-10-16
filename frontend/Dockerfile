# ==============================================================================
# Multi-stage Production Dockerfile for ResQGrid Frontend
# ==============================================================================

# Stage 1: Build static assets
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src/ ./src/

RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: High Performance Nginx Web Server
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Copy compiled production bundle
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
