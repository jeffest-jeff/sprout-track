# Cloudflare Tunnel

## Overview

Cloudflare Tunnel exposes Sprout Track to the internet over a secure outbound connection — no inbound firewall ports, no public IP required. Optionally, Cloudflare Access can sit in front of the tunnel and enforce Google OAuth (or any supported identity provider) before a request reaches the app. When both are configured, Sprout Track automatically signs in account holders whose email matches their Cloudflare-authenticated identity, skipping the PIN entry step entirely.

**Local and LAN access is always unaffected.** The auto-login behavior is detected by the presence of the `CF_Authorization` cookie, which Cloudflare only injects on requests that pass through the tunnel. Users on the local network reach the app directly and see the normal login screen.

---

## Tunnel Setup

Two deployment options are supported:

### Option A — Docker sidecar (standalone Docker deployments)

Add a `cloudflared` service to your `docker-compose.yml` alongside the `app` container:

```yaml
services:
  app:
    # ... your existing app service ...

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    restart: unless-stopped
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - app
```

Then add `CLOUDFLARE_TUNNEL_TOKEN` to your `.env`:

```
CLOUDFLARE_TUNNEL_TOKEN="eyJ..."
```

Get the token from [one.dash.cloudflare.com](https://one.dash.cloudflare.com) → Networks → Tunnels → Create a tunnel → Docker. Copy the token value from the shown command.

The tunnel forwards to `http://app:3000` inside the Docker network automatically.

### Option B — Home Assistant cloudflared addon (recommended for HA users)

If you already run the [Cloudflare addon](https://github.com/brenner-tobias/addon-cloudflared) in Home Assistant, reuse that existing tunnel — no changes to Sprout Track's Docker config are needed.

1. In Zero Trust → Networks → Tunnels → click your HA tunnel → **Public Hostnames** tab → **Add a public hostname**
2. Configure:
   - **Subdomain:** e.g. `sprout`
   - **Domain:** your registered domain
   - **Service type:** `HTTP`
   - **URL:** `<sprout-track-host-ip>:3000` (the machine running the Docker container)
3. Save

Sprout Track will now be reachable at `https://sprout.yourdomain.com`.

---

## Cloudflare Access SSO (Optional)

Cloudflare Access protects your public hostname with an identity provider (Google, email OTP, etc.) before any request reaches the app. When a user is authenticated by Cloudflare, the app can read their identity from a signed JWT cookie and log them in automatically.

### Zero Trust Dashboard Setup

1. In [one.dash.cloudflare.com](https://one.dash.cloudflare.com) → **Access → Applications** → **Add an application → Self-Hosted**
2. Set the **Application domain** to your public hostname (e.g. `sprout.yourdomain.com`)
3. Configure a **Policy** — allow by email address, Google OAuth, or another supported provider
4. Save and open the application detail page
5. Copy the **AUD tag** (a 64-character hex string) — you'll need this for the env var

Your **team domain** is the subdomain shown in the URL bar of the Zero Trust dashboard: `yourteam.cloudflareaccess.com`.

### Sprout Track Environment Variables

Add these to your `.env` file (or docker-compose environment section):

| Variable | Required | Description |
|---|---|---|
| `CLOUDFLARE_ACCESS_TEAM_DOMAIN` | Yes | Your team domain, e.g. `myteam.cloudflareaccess.com` |
| `CLOUDFLARE_ACCESS_AUDIENCE` | Yes | The AUD tag from the Access application policy page |
| `CLOUDFLARE_ACCESS_SKIP_PIN` | Yes | Set to `true` to enable auto-login for CF-authenticated accounts |

Example:

```
CLOUDFLARE_ACCESS_TEAM_DOMAIN="myteam.cloudflareaccess.com"
CLOUDFLARE_ACCESS_AUDIENCE="abc123def456..."
CLOUDFLARE_ACCESS_SKIP_PIN="true"
```

After adding these, rebuild the Docker image: `docker compose up -d --build`.

### How Auto-Login Works

1. User navigates to the public hostname → Cloudflare Access checks their identity
2. On success, Cloudflare injects a signed `CF_Authorization` JWT cookie and forwards the request to the app
3. When the login screen loads, it calls `GET /api/auth/cloudflare` — the server detects the cookie and returns `{ available: true }`
4. The client silently posts to `POST /api/auth/cloudflare`
5. The server validates the JWT against Cloudflare's public keys (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`), extracts the email, and looks up the matching `Account` record
6. On success, the server returns a standard app session token; the client stores it and redirects to the family dashboard

If the email has no matching account, or if any env var is missing, the check returns `{ available: false }` and the normal login form appears as a fallback.

### Requirements and Limitations

- **Account must exist first.** The Cloudflare email must match an `Account.email` in the database. Log in with your email/password at least once before enabling SSO to ensure the account exists.
- **Caretaker PIN login is unaffected.** SSO only applies to account-based logins. PIN-authenticated caretakers always use the PIN flow regardless of CF configuration.
- **No auto-create.** Accounts are not created automatically. If the email doesn't match, the user sees an error and the standard login form.
- **JWT public keys are cached for 5 minutes** in memory (`src/lib/cloudflare-access.ts`). A container restart clears the cache.

---

## Key Files

| File | Purpose |
|---|---|
| `src/lib/cloudflare-access.ts` | Fetches and caches CF JWKS certs; validates RS256 JWT |
| `app/api/auth/cloudflare/route.ts` | `GET` check endpoint + `POST` auto-login endpoint |
| `src/components/LoginSecurity/index.tsx` | Client-side CF detection and auto-login flow |
