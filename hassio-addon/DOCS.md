# Sprout Track

A self-hosted baby activity tracker. Log feedings, diapers, sleep, measurements, milestones, medicine, and more — with a full calendar, reports, growth charts, and push notifications.

## First Run

On first access, the **Setup Wizard** will guide you through:

1. **Family setup** — family name and URL slug
2. **Security setup** — system-wide PIN or per-caretaker PINs
3. **Baby setup** — name, birth date, and feeding/diaper thresholds

Click **OPEN WEB UI** on the addon page, or navigate to `http://<your-ha-host>:3000`.

Default admin password for the Family Manager (`/family-manager`): **`admin`**

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `auth_life` | `86400` | How long a login session stays valid, in seconds (default: 24 hours) |
| `idle_time` | `604800` | How long before an idle session is logged out, in seconds (default: 7 days) |
| `enable_notifications` | `true` | Enable push notification infrastructure. Notifications must also be configured in the Family Manager after HTTPS is set up. |

## Data Storage

The SQLite database is stored at `/share/sprout-track/` on your Home Assistant host. This directory is outside the addon container, so your data persists across addon updates and restarts.

- `baby-tracker.db` — main application database
- `baby-tracker-logs.db` — API request logs (if logging is enabled)
- `.env` — generated secrets and configuration (back this up)

**Back up your data** regularly using the backup option in the Family Manager settings, or include `/share/sprout-track/` in your HA backup configuration.

## Push Notifications

Push notifications require HTTPS. To enable them:

1. Set up HTTPS access (via Cloudflare Tunnel or a reverse proxy with a valid certificate)
2. Open the Family Manager at `/family-manager` → **Settings** → **Push Notifications**
3. Generate VAPID keys and configure the notification schedule

## Cloudflare Tunnel (Remote Access)

If you use the [Cloudflare addon](https://github.com/brenner-tobias/addon-cloudflared) for remote access, add a public hostname pointing to `http://homeassistant.local:3000` (or the HA host IP) in the Zero Trust dashboard.

Optionally, enable **Cloudflare Access SSO** so account holders are signed in automatically when accessing from outside your network:

1. Create a Cloudflare Access application protecting your Sprout Track hostname
2. Copy the AUD tag from the application's detail page
3. In the Family Manager → **App Configuration**, set:
   - `CLOUDFLARE_ACCESS_TEAM_DOMAIN` — your team domain (e.g. `myteam.cloudflareaccess.com`)
   - `CLOUDFLARE_ACCESS_AUDIENCE` — the AUD tag
   - `CLOUDFLARE_ACCESS_SKIP_PIN` — `true`

When configured, users arriving via the tunnel are signed in automatically. Local access always uses the normal PIN or account login.

## HA Sidebar Shortcut

To add Sprout Track to the Home Assistant sidebar, add the following to your `configuration.yaml` and restart HA:

```yaml
panel_iframe:
  sprout_track:
    title: Sprout Track
    icon: mdi:baby-carriage
    url: http://homeassistant.local:3000
    require_admin: false
```

Replace `homeassistant.local` with your HA host IP or hostname if needed. The panel opens Sprout Track in a full-page frame inside the HA UI.

## Multi-Caretaker Setup

Each family can have individual caretakers with their own PINs and roles (parent, nanny, daycare, etc.). Manage caretakers in the **Family Manager** → **Caretakers**.

For simpler setups, a single system PIN works for everyone — no individual logins required.

## Family Manager

Access the admin panel at `http://<your-ha-host>:3000/family-manager`.

From here you can:
- Reset the admin password
- Configure email (SMTP) for account registration and notifications
- Manage database backups and restores
- Generate and manage VAPID keys for push notifications
- Add and manage multiple families
- Configure app-wide settings

Default password: `admin` — change this on first login.

## Support

- GitHub: [https://github.com/jeffest-jeff/sprout-track](https://github.com/jeffest-jeff/sprout-track)
- Issues: [https://github.com/jeffest-jeff/sprout-track/issues](https://github.com/jeffest-jeff/sprout-track/issues)
