# ==============================================================================
# Multi-Stage Production Dockerfile for AR/VR Academy Platform (Root build context)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base Alpine Environment
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Dependencies Installation & Prisma Generation
# ------------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy package manifests from ARVR subdirectory
COPY ARVR/package.json ARVR/package-lock.json* ./
COPY ARVR/prisma ./prisma/

# Install deterministic production and build dependencies
RUN npm ci

# Generate Prisma client for Linux Alpine
RUN npx prisma generate

# ------------------------------------------------------------------------------
# Stage 3: Source Compilation & Standalone Build
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY ARVR/ .

# Build-time environment configuration (no production secrets)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://build_dummy:build_dummy@localhost:5432/build_dummy?schema=public"
ENV SESSION_SECRET="build_time_dummy_session_secret_32chars_min"

# Compile Next.js with standalone output bundle
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 4: Minimal Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl wget
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create unprivileged system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js public assets and pre-rendered standalone bundle
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy container entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
