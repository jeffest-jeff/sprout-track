ARG BUILD_FROM

# Build stage: compile the Next.js app
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY scripts/prisma-provider.js ./scripts/
RUN npm ci
ENV DATABASE_PROVIDER=sqlite
RUN npm run prisma:generate && npm run prisma:generate:log
COPY . .
RUN npm run build

# Final stage: HA base image with the built app
FROM ${BUILD_FROM}
RUN apk add --no-cache nodejs npm openssl tzdata
WORKDIR /app

# Copy the full built application (Next.js is run via `npm start`, not standalone)
COPY --from=builder /app ./

# Install the bashio-based run script
COPY hassio-addon/run.sh /run.sh
RUN sed -i 's/\r$//' /run.sh && chmod a+x /run.sh

EXPOSE 3000
CMD ["/run.sh"]
