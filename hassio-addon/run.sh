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

# Ensure all required env defaults are present in the env file
mkdir -p /app/env
npm run env:ensure -- docker /app/env/.env || true

ENV_FILE="/app/env/.env"

# Overwrite the database paths in the env file.
# env:ensure writes SQLite defaults that only work in the standard Docker container
# (file:../db/baby-tracker.db resolves via a /db volume symlink that doesn't exist here).
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

# Source the env file so all child processes inherit the correct variables
set -a
. "$ENV_FILE"
set +a

# Write a minimal /app/.env so Prisma reads the correct DATABASE_URL from the
# project root (where it looks by default) rather than any baked-in file.
printf 'DATABASE_URL="file:/share/sprout-track/baby-tracker.db"\nLOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"\n' > /app/.env

bashio::log.info "Generating Prisma clients..."
npm run prisma:generate
npm run prisma:generate:log

bashio::log.info "Running database migrations..."
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss --skip-generate
npx prisma db push --schema=prisma/log-schema.prisma --accept-data-loss --skip-generate

bashio::log.info "Seeding database..."
npx prisma db seed || true

bashio::log.info "Starting Sprout Track..."
exec npm start
