# Sprout Track

v1.3.4 😁 - A self-hosted Next.js application for tracking baby activities, milestones, and development.

![Docker Image Size](https://img.shields.io/docker/image-size/sprouttrack/sprout-track) ![Docker Pulls](https://img.shields.io/docker/pulls/sprouttrack/sprout-track)

## Live Demo

Try out Sprout Track at our live demo: **[https://www.sprout-track.com/demo](https://www.sprout-track.com/demo)**

*The demo environment is refreshed every 1 hour.*

- ID: `01`
- PIN: `111111`

## Features

### Activity Tracking & Daily Dashboard

Track sleep, feeding, diapers, bath, measurements, medicine, activities, milestones, and more. The daily dashboard gives you an at-a-glance summary with real-time stats and active session tracking.

<p>
  <img src="public/readme/SproutTrackLogEntryView.png" width="500" alt="Daily Dashboard — Desktop" style="border-radius: 8px;" />
&nbsp;&nbsp;
  <img src="public/readme/SproutTrackLogEntryMobile.png" width="200" alt="Daily Dashboard — Mobile" style="border-radius: 8px;" />
</p>

### Calendar

Browse activity history on a monthly calendar with color-coded indicators by activity type. Tap any day to see a detailed breakdown.

<p>
  <img src="public/readme/CalendarDesktop.png" width="500" alt="Calendar — Desktop" style="border-radius: 8px;" />
  &nbsp;&nbsp;
  <img src="public/readme/CalandarMobile.png" width="200" alt="Calendar — Mobile" style="border-radius: 8px;" />
</p>

### Reporting & Growth Charts

Monthly reports with growth metrics, percentile curves, feeding stats, sleep analysis, and activity breakdowns. Export a monthly report card as a PDF.

<p>
  <img src="public/readme/ReportingMobile1.png" width="200" alt="Growth Report" style="border-radius: 8px;" />
  &nbsp;
  <img src="public/readme/ReportingMobile2.png" width="200" alt="Feeding & Sleep Report" style="border-radius: 8px;" />
  &nbsp;
  <img src="public/readme/ReportingMobile3.png" width="200" alt="Activity Report" style="border-radius: 8px;" />
</p>
<p>
  <img src="public/readme/ReportCardPDF.png" width="500" alt="PDF Report Card" style="border-radius: 8px;" />
</p>

### Full Activity Log & Export

Searchable, filterable activity log with pagination and data export to csv or xlsx.

<p>
  <img src="public/readme/FullLogExport.png" width="500" alt="Full Log & Export" style="border-radius: 8px;" />
</p>

### Nursery Mode

A fullscreen, tap-friendly interface with large buttons — perfect for daycare providers and nighttime use. Configurable background colors and brightness.

<p>
  <img src="public/readme/NurseryMode.png" width="500" alt="Nursery Mode" style="border-radius: 8px;" />
</p>

### Dark Mode

Full dark theme support across the entire application.

<p>
  <img src="public/readme/SproutTrackLogEntryDarkMode.png" width="200" alt="Dark Mode" style="border-radius: 8px;" />
</p>

### Multi-Language Support

Available in English, Spanish, French, German, and Italian. Language preferences are saved per-user.

<p>
  <img src="public/readme/Localized.png" width="200" alt="Language Selection" style="border-radius: 8px;" />
</p>

### Push Notifications

Real-time push notifications keep all caretakers informed when activities are logged.

<p>
  <img src="public/readme/Notification.png" width="200" alt="Push Notification" style="border-radius: 8px;" />
</p>

### API & Integrations

API key management and webhook support for external integrations like Home Assistant, Grafana, and NFC tags.

<p>
  <img src="public/readme/API-Desktop.png" width="420" alt="Daily Dashboard — Desktop" style="border-radius: 8px;" />
&nbsp;&nbsp;
  <img src="public/readme/API-KeyMobile.png" width="200" alt="API & Integrations" style="border-radius: 8px;" />
</p>

### More

- **PWA** — Install on any device with notifications, keep-awake mode, and fullscreen. For the best experience, use Chrome, Edge, or Safari to add the app to your home screen from the family login screen. Firefox does not fully support PWA features (icons, theme colors, and standalone mode may not work correctly).
- **Multi-Family** - Setup separate family dashboards to allow friends and family to privately track their child
- **Multi-Caretaker** — Each family uses individual PINs for parents, grandparents, babysitters, and daycare
- **Family Accounts** — Track multiple babies in a shared family workspace
- **SQLite or PostgreSQL** — Choose the database that fits your setup
- **Self-Hosted** — Full control over your data with Docker deployment
- **Backup & Restore** — Database backup and recovery built in
- **Track Contacts** - Track shared contacts, and tie them to medications, calendar events, or have them readily accessible in app

---

## Quick Start: Docker (SQLite)

```bash
docker run -d \
  --name sprout-track \
  --restart unless-stopped \
  -p 3000:3000 \
  -v sprout-track-db:/db \
  -v sprout-track-env:/app/env \
  -v sprout-track-files:/app/Files \
  sprouttrack/sprout-track:latest
```

## Quick Start: Docker (PostgreSQL)

Requires an existing PostgreSQL 14+ server. Create the `sprout_track` and `sprout_track_logs` databases, then run:

```bash
docker run -d \
  --name sprout-track \
  --restart unless-stopped \
  -p 3000:3000 \
  -e DATABASE_PROVIDER=postgresql \
  -e DATABASE_URL="postgresql://user:password@your-host:5432/sprout_track" \
  -e LOG_DATABASE_URL="postgresql://user:password@your-host:5432/sprout_track_logs" \
  -v sprout-track-env:/app/env \
  -v sprout-track-files:/app/Files \
  sprouttrack/sprout-track:latest
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- Default PIN: `111222`
- Default /family-manager admin password: `admin`

The Setup Wizard will guide you through initial configuration on first access.

See [Docker Deployment](documentation/Admin-Documentation/docker-deployment.md) for docker-compose setup, volumes, custom ports, and container details.

## Quick Start: Home Assistant Addon

Sprout Track can run as a Home Assistant addon. The addon definition lives in `hassio-addon/`.

1. Add this repository as a custom addon repository in Home Assistant (Settings → Add-ons → Add-on Store → ⋮ → Repositories).
2. Install the "Sprout Track" addon.
3. Configure `auth_life`, `idle_time`, and `enable_notifications` in the addon options.
4. Start the addon and open the Web UI on port 3000.

The SQLite database is persisted under Home Assistant's `/share/sprout-track` directory so it survives restarts and updates.

### Home Assistant integration (outbound webhook)

Beyond the inbound REST API + API keys, Sprout Track can **push** events to Home Assistant via an outbound webhook. In Settings → Integrations, set your HA webhook URL, optionally provide an HMAC secret, enable it, and use "Test Webhook" to verify. Custom activity log entries dispatch a `custom_activity_created` event; the payload is `{ event, timestamp, familyId, data }` and is signed with `X-Sprout-Signature` (HMAC-SHA256) when a secret is configured.

## Cloudflare Tunnel (Remote Access)

Sprout Track can be securely exposed to the internet via a Cloudflare Tunnel — no open inbound firewall ports required. Two deployment options are supported.

### Option A — Docker sidecar (standalone deployments)

Add a `cloudflared` service alongside the app container in your `docker-compose.yml`:

```yaml
services:
  app:
    # ... existing app service ...

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    restart: unless-stopped
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - app
```

Get your tunnel token from the [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com) → Networks → Tunnels → Create a tunnel → Docker, then copy the token value into `CLOUDFLARE_TUNNEL_TOKEN` in your `.env`.

### Option B — Home Assistant cloudflared addon (recommended for HA users)

If you already run the [Cloudflare addon](https://github.com/brenner-tobias/addon-cloudflared) in Home Assistant, reuse that existing tunnel:

1. In Zero Trust → Networks → Tunnels → click your HA tunnel → **Public Hostnames** tab → **Add a public hostname**
2. Set the service to `http://<sprout-track-host-ip>:3000`
3. Save — no changes to Sprout Track's Docker config needed

---

### Cloudflare Access SSO (optional)

Cloudflare Access can protect your public hostname with Google OAuth or email-based authentication. When enabled, Sprout Track automatically signs in account holders whose email matches their Cloudflare-authenticated identity — no PIN entry required. Local network access is unaffected (the auto-login only triggers when the request arrives through the tunnel).

**Cloudflare Zero Trust setup:**

1. In Zero Trust → **Access → Applications** → **Add an application → Self-Hosted**
2. Set the application domain to your public hostname
3. Configure a policy (allow by email, Google OAuth, etc.)
4. Copy the **AUD tag** shown on the application detail page

**Sprout Track env vars** (add to your `.env` or docker-compose environment):

| Variable | Description |
|---|---|
| `CLOUDFLARE_ACCESS_TEAM_DOMAIN` | Your team domain, e.g. `myteam.cloudflareaccess.com` |
| `CLOUDFLARE_ACCESS_AUDIENCE` | The AUD tag from your Access application |
| `CLOUDFLARE_ACCESS_SKIP_PIN` | Set to `true` to enable auto-login for CF-authenticated accounts |

**How it works:**

- When a user reaches the login page through the tunnel, the app silently calls `GET /api/auth/cloudflare` to detect the Cloudflare JWT cookie
- If detected, it auto-posts to `POST /api/auth/cloudflare`, which validates the JWT against Cloudflare's public keys and looks up the matching account by email
- On success, the user is redirected directly to their family dashboard
- If the email has no matching account, or if `CLOUDFLARE_ACCESS_SKIP_PIN` is not set, the normal login form is shown instead

> **Note:** The account email in Sprout Track must exactly match the email Cloudflare authenticates. Log in with your account password at least once before enabling SSO to ensure the account exists.

## Quick Start: Local (SQLite)

Requires Node.js 22+, npm 10+, Git, and Bash.

```bash
git clone https://github.com/Oak-and-Sprout/sprout-track.git
cd sprout-track
chmod +x scripts/*.sh
./scripts/setup.sh
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

PostgreSQL is also supported for local deployments. See [Local Deployment](documentation/Admin-Documentation/local-deployment.md) for PostgreSQL setup, manual setup, available scripts, and service management.

## First-Time Setup

On first access, the Setup Wizard walks you through:

1. **Family Setup** -- family name, URL slug, optional data import
2. **Security Setup** -- system-wide PIN or individual caretaker PINs
3. **Baby Setup** -- name, birth date, feed/diaper warning thresholds

The **Family Manager** at `/family-manager` (default password: `admin`) provides admin controls for domain settings, HTTPS, email, database backups, and push notifications.

See [Initial Setup](documentation/Admin-Documentation/initial-setup.md) for details.

## Documentation

| Guide | Description |
|-------|-------------|
| [Docker Deployment](documentation/Admin-Documentation/docker-deployment.md) | Volumes, ports, container startup, building locally |
| [Local Deployment](documentation/Admin-Documentation/local-deployment.md) | Manual setup, scripts reference, systemd service |
| [Initial Setup](documentation/Admin-Documentation/initial-setup.md) | Setup Wizard, default credentials, Family Manager |
| [Environment Variables](documentation/Admin-Documentation/environment-variables.md) | Full variable reference, auto-generation, security notes |
| [Cloudflare Tunnel](documentation/Admin-Documentation/cloudflare-tunnel.md) | Remote access via Cloudflare Tunnel and Access SSO |
| [Upgrades and Backups](documentation/Admin-Documentation/upgrades-and-backups.md) | Upgrade procedures, backup/restore for Docker and local |
| [Push Notifications](documentation/Admin-Documentation/push-notifications.md) | VAPID keys, cron setup, per-user configuration |
| [Webhook API](documentation/Admin-Documentation/webhook-api.md) | External integrations (Home Assistant, Grafana, NFC, etc.) |
| [API Logging](documentation/Admin-Documentation/api-logging.md) | Optional request/response logging |
| [Admin Password Reset](documentation/Admin-Documentation/admin-password-reset.md) | Automatic reset when upgrading from older versions |

## Tech Stack

- Next.js with App Router
- Prisma with SQLite or PostgreSQL
- Tailwind
- Docker