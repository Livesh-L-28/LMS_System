#!/bin/sh
set -e

echo "================================================================"
echo "🚀 AR/VR Academy - Production Container Initializing"
echo "================================================================"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Node Version: $(node -v)"
echo "Environment: ${NODE_ENV:-production}"

# 1. Database Connectivity Wait Loop
if [ -n "$DATABASE_URL" ]; then
  echo "[Entrypoint] Verifying database connectivity..."
  
  MAX_RETRIES=${DB_WAIT_RETRIES:-30}
  RETRY_COUNT=0
  
  until node -e "
    const url = new URL(process.env.DATABASE_URL);
    const net = require('net');
    const port = url.port || 5432;
    const host = url.hostname;
    const socket = net.createConnection(port, host, () => {
      socket.end();
      process.exit(0);
    });
    socket.on('error', () => process.exit(1));
    setTimeout(() => { socket.destroy(); process.exit(1); }, 2000);
  " 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo "❌ [Entrypoint] ERROR: Database host unreachable after $MAX_RETRIES attempts. Exiting."
      exit 1
    fi
    echo "[Entrypoint] Database is not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES). Retrying in 2s..."
    sleep 2
  done
  echo "✅ [Entrypoint] Database is reachable."
else
  echo "⚠️  [Entrypoint] WARNING: DATABASE_URL not set."
fi

# 2. Database Migration Execution
if [ "$SKIP_MIGRATIONS" != "true" ] && [ -n "$DATABASE_URL" ]; then
  echo "[Entrypoint] Applying database schema migrations..."
  if npx prisma migrate deploy; then
    echo "✅ [Entrypoint] Database migrations applied successfully."
  else
    echo "⚠️  [Entrypoint] Migration attempt failed. Continuing startup..."
  fi
else
  echo "[Entrypoint] Skipping database migrations (SKIP_MIGRATIONS=${SKIP_MIGRATIONS:-false})."
fi

# 3. Process Execution & Signal Propagation
# Using 'exec' replaces the shell process with the command specified in CMD.
# This ensures signals (SIGTERM, SIGINT) are delivered directly to the Node.js process (PID 1)
# enabling graceful shutdown of active connections.
echo "================================================================"
echo "🎯 Starting Application Process: $@"
echo "================================================================"

exec "$@"
