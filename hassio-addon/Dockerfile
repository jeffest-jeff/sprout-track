ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:latest

# Pull the pre-built app image from Docker Hub.
# Switch to ghcr.io/jeffest-jeff/sprout-track:latest once the ghcr-image.yml
# workflow has run and the package has been made public on GitHub Packages.
FROM sprouttrack/sprout-track:latest AS app

# Final stage: HA base image (provides bashio, s6-overlay, etc.)
FROM ${BUILD_FROM}

RUN apk add --no-cache nodejs npm openssl tzdata

WORKDIR /app

# Copy the full built application from the app image
COPY --from=app /app ./

COPY run.sh /run.sh
RUN sed -i 's/\r$//' /run.sh && chmod a+x /run.sh

EXPOSE 3000
CMD ["/run.sh"]
