#!/usr/bin/with-contenv bashio

# Map HA addon options to environment variables
export AUTH_LIFE=$(bashio::config 'auth_life')
export IDLE_TIME=$(bashio::config 'idle_time')
export ENABLE_NOTIFICATIONS=$(bashio::config 'enable_notifications')

# Persist the SQLite database under HA's /share so it survives addon restarts
export DATABASE_PROVIDER="sqlite"
export DATABASE_URL="file:/share/sprout-track/baby-tracker.db"
export LOG_DATABASE_URL="file:/share/sprout-track/baby-tracker-logs.db"
export NODE_ENV="production"
export PORT="3000"

mkdir -p /share/sprout-track

# Ensure env defaults (generates ENC_HASH, secrets, etc.)
mkdir -p /app/env
npm run env:ensure -- docker /app/env/.env || true

bashio::log.info "Generating Prisma clients..."
npm run prisma:generate
npm run prisma:generate:log

bashio::log.info "Running database migrations..."
npx prisma migrate deploy
npx prisma db push --schema=prisma/log-schema.prisma --accept-data-loss --skip-generate

bashio::log.info "Seeding database..."
npx prisma db seed || true

bashio::log.info "Starting Sprout Track..."
exec npm start
