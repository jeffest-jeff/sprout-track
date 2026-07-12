#!/usr/bin/with-contenv bashio

# Map HA addon options to environment variables
export AUTH_LIFE=$(bashio::config 'auth_life')
export IDLE_TIME=$(bashio::config 'idle_time')
export ENABLE_NOTIFICATIONS=$(bashio::config 'enable_notifications')

export DATABASE_PROVIDER="sqlite"
export NODE_ENV="production"
export PORT="3000"

# Ensure the share directory exists for persistent storage
mkdir -p /share/sprout-track
mkdir -p /app/env

# Populate env defaults (JWT_SECRET, VAPID keys, etc.) into the persistent env file.
# We do not rely on this for DATABASE_URL — we assert the correct paths below.
npm run env:ensure -- docker /app/env/.env || true

ENV_FILE="/app/env/.env"

# Patch database paths in the env file so they are correct if anything reads it directly
if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL="file:/share/sprout-track/baby-tracker.db"|' "$ENV_FILE"
else
  echo 'DATABASE_URL="file:/share/sprout-track/baby-tracker.db"' >> "$ENV_FILE"
fi

if grep -q "^LOG_DATABASE_URL=" "$ENV_FILE"; then
  sed -i 's|^LOG_DATABASE_URL=.*|LOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"|' "$ENV_FILE"
else
  echo 'LOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"' >> "$ENV_FILE"
fi

# Source the env file to pick up JWT_SECRET, VAPID keys, and other generated secrets
set -a
. "$ENV_FILE"
set +a

# Re-assert the correct database paths AFTER sourcing. If the env file still had
# a stale DATABASE_URL (e.g. sed didn't match), sourcing would have clobbered our
# intended value. This guarantees the correct path regardless.
export DATABASE_URL="file:/share/sprout-track/baby-tracker.db"
export LOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"

# Write /app/.env so Prisma CLI reads the correct database paths from the project
# root (Prisma looks for .env at /app/.env by default, before process.env).
printf 'DATABASE_URL="file:/share/sprout-track/baby-tracker.db"\nLOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"\n' > /app/.env

bashio::log.info "DATABASE_URL: $DATABASE_URL"
bashio::log.info "LOG_DATABASE_URL: $LOG_DATABASE_URL"

bashio::log.info "Generating Prisma clients..."
npm run prisma:generate
npm run prisma:generate:log

bashio::log.info "Running database migrations..."
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss --skip-generate
bashio::log.info "Main schema push done"
npx prisma db push --schema=prisma/log-schema.prisma --accept-data-loss --skip-generate
bashio::log.info "Log schema push done"

bashio::log.info "Seeding database..."
npx prisma db seed || true

bashio::log.info "Starting Sprout Track..."
exec npm start
