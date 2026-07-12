#!/usr/bin/with-contenv bashio

# Map HA addon options to environment variables
export AUTH_LIFE=$(bashio::config 'auth_life')
export IDLE_TIME=$(bashio::config 'idle_time')
export ENABLE_NOTIFICATIONS=$(bashio::config 'enable_notifications')

export DATABASE_PROVIDER="sqlite"
export LOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"
export NODE_ENV="production"
export PORT="3000"

# Ensure the share directory exists for persistent storage
mkdir -p /share/sprout-track
mkdir -p /app/env

# Populate env defaults (JWT_SECRET, VAPID keys, etc.)
npm run env:ensure -- docker /app/env/.env || true

ENV_FILE="/app/env/.env"

# Patch LOG_DATABASE_URL in the env file
if grep -q "^LOG_DATABASE_URL=" "$ENV_FILE"; then
  sed -i 's|^LOG_DATABASE_URL=.*|LOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"|' "$ENV_FILE"
else
  echo 'LOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"' >> "$ENV_FILE"
fi

# Source the env file to pick up JWT_SECRET, VAPID keys, and other generated secrets
set -a
. "$ENV_FILE"
set +a

# Re-assert LOG_DATABASE_URL after sourcing
export LOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"

bashio::log.info "Configuring Prisma schemas..."

# Step 1: Run prisma-provider.js to set the sqlite provider. This also hardcodes
# url = "file:../db/baby-tracker.db" in schema.prisma.
node scripts/prisma-provider.js

# Step 2: Immediately overwrite the hardcoded URL with the absolute HA path.
#
# WHY: prisma-provider.js hardcodes a relative SQLite path. The Prisma CLI resolves
# relative paths from the schema file location (/app/prisma/), producing /app/db/baby-tracker.db.
# The Prisma CLIENT resolves relative paths from the process CWD (/app/), producing
# /db/baby-tracker.db. These are DIFFERENT files, so db push creates tables in one
# location and the running app reads from another (empty) database.
#
# Using an absolute path guarantees both the CLI and the generated client connect to
# the same /share/sprout-track/baby-tracker.db file every time.
sed -i 's|url      = "file:../db/baby-tracker.db"|url      = "file:/share/sprout-track/baby-tracker.db"|' /app/prisma/schema.prisma

bashio::log.info "Schema patched: url = file:/share/sprout-track/baby-tracker.db"

# Step 3: Generate Prisma clients with the patched schema. The absolute path gets
# embedded in the generated client so the app and seed also connect to the right file.
# Call prisma directly (not npm run prisma:generate) to avoid re-running prisma:prepare
# which would revert our schema patch.
bashio::log.info "Generating Prisma clients..."
npx prisma generate
npx prisma generate --schema=prisma/log-schema.prisma

bashio::log.info "Running database migrations..."
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss --skip-generate
bashio::log.info "Main schema push done"
npx prisma db push --schema=prisma/log-schema.prisma --accept-data-loss --skip-generate
bashio::log.info "Log schema push done"

bashio::log.info "Seeding database..."
npx prisma db seed || true

bashio::log.info "Starting Sprout Track..."
exec npm start
