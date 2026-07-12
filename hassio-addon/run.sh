#!/usr/bin/with-contenv bashio

# Map HA addon options to environment variables
export AUTH_LIFE=$(bashio::config 'auth_life')
export IDLE_TIME=$(bashio::config 'idle_time')
export ENABLE_NOTIFICATIONS=$(bashio::config 'enable_notifications')

export DATABASE_PROVIDER="sqlite"
export NODE_ENV="production"
export PORT="3000"

# Set database URLs to absolute paths before anything else runs.
# The Prisma client reads process.env.DATABASE_URL at runtime; using an absolute path
# here ensures it connects to the same file that db push creates.
export DATABASE_URL="file:/share/sprout-track/baby-tracker.db"
export LOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"

# Ensure the share directory exists for persistent storage
mkdir -p /share/sprout-track
mkdir -p /app/env

# Populate env defaults (JWT_SECRET, VAPID keys, etc.)
npm run env:ensure -- docker /app/env/.env || true

ENV_FILE="/app/env/.env"

# Patch database URLs in the env file so sourcing it doesn't overwrite our exports
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

# Re-assert database URLs after sourcing in case the env file still had stale values
export DATABASE_URL="file:/share/sprout-track/baby-tracker.db"
export LOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"

bashio::log.info "DATABASE_URL: $DATABASE_URL"

bashio::log.info "Configuring Prisma schemas..."

# Run prisma-provider.js to set the sqlite provider. This also hardcodes
# url = "file:../db/baby-tracker.db" in schema.prisma.
node scripts/prisma-provider.js

# Patch schema.prisma to use the absolute HA path.
# prisma-provider.js hardcodes a relative URL. The Prisma CLI resolves relative
# SQLite paths from the schema file location (/app/prisma/), but the runtime
# Prisma client resolves from CWD (/app/) — different directories, different files.
# An absolute path guarantees both connect to the same /share/sprout-track/ file.
sed -i 's|url      = "file:../db/baby-tracker.db"|url      = "file:/share/sprout-track/baby-tracker.db"|' /app/prisma/schema.prisma
bashio::log.info "Schema patched: url = file:/share/sprout-track/baby-tracker.db"

# Generate Prisma clients using the patched schema (call npx directly to avoid
# npm run prisma:generate which re-runs prisma:prepare and reverts the patch)
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
