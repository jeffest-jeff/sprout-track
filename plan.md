# Custom Activities Feature Plan

## Overview

Add the ability for families to define and track custom activities beyond the built-in types (feed, sleep, diaper, etc.). Each custom activity has a name, icon, and a configurable set of typed fields (text, number with unit, duration, boolean, select) that families define themselves.

---

## Goals

1. Families can create named custom activity types with an icon and color in the settings panel.
2. Each custom activity type can have N typed fields, each with an optional unit (e.g., "mL", "oz", "mg").
3. Caretakers can log entries for any custom activity from the main UI.
4. Custom activity entries appear in the timeline and full log, filtered/searched alongside built-in activities.
5. Custom activity types and entries are family-scoped and follow existing auth/isolation patterns.

---

## Architecture Decisions

- Custom activity **definitions** are stored in two new Prisma models: `CustomActivity` and `CustomActivityField`.
- Custom activity **log entries** are stored in two new models: `CustomActivityLog` and `CustomActivityLogValue` (EAV pattern for flexible fields).
- The activity detection system in `Timeline/utils.tsx` is extended to recognize `CustomActivityLog` entries via a `customActivityId` property.
- The admin/settings UI lives in the existing settings panel (per-family, not the system-admin `family-manager` panel) — families manage their own custom activities.
- Custom activity management is accessible via a new "Custom Activities" section in settings.

---

## Database Changes (`prisma/schema.prisma`)

### New Models

```prisma
model CustomActivity {
  id          String   @id @default(cuid())
  familyId    String
  name        String
  icon        String   // emoji or icon key
  color       String   // hex color or tailwind color key
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  family      Family                @relation(fields: [familyId], references: [id])
  fields      CustomActivityField[]
  logs        CustomActivityLog[]
}

model CustomActivityField {
  id               String   @id @default(cuid())
  customActivityId String
  name             String
  fieldType        CustomFieldType  // NUMBER, TEXT, BOOLEAN, DURATION, SELECT
  unit             String?          // e.g. "mL", "oz", "mg", "°F"
  options          String?          // JSON array of strings for SELECT type
  isRequired       Boolean  @default(false)
  sortOrder        Int      @default(0)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  deletedAt        DateTime?

  customActivity   CustomActivity          @relation(fields: [customActivityId], references: [id])
  logValues        CustomActivityLogValue[]
}

model CustomActivityLog {
  id               String   @id @default(cuid())
  familyId         String
  babyId           String
  caretakerId      String
  customActivityId String
  time             DateTime
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  deletedAt        DateTime?

  family           Family              @relation(fields: [familyId], references: [id])
  baby             Baby                @relation(fields: [babyId], references: [id])
  caretaker        Caretaker           @relation(fields: [caretakerId], references: [id])
  customActivity   CustomActivity      @relation(fields: [customActivityId], references: [id])
  fieldValues      CustomActivityLogValue[]
}

model CustomActivityLogValue {
  id                    String   @id @default(cuid())
  customActivityLogId   String
  customActivityFieldId String
  value                 String   // all values stored as strings; parsed by fieldType

  customActivityLog     CustomActivityLog    @relation(fields: [customActivityLogId], references: [id])
  customActivityField   CustomActivityField  @relation(fields: [customActivityFieldId], references: [id])
}

enum CustomFieldType {
  NUMBER
  TEXT
  BOOLEAN
  DURATION
  SELECT
}
```

### Migration

Run `npx prisma migrate dev --name add-custom-activities` after schema changes. Both SQLite and PostgreSQL are supported — the schema uses only types compatible with both.

---

## API Routes

All routes follow the existing `withAuthContext` pattern. All data is family-scoped via `authContext.familyId`.

### Custom Activity Definitions

**`/app/api/custom-activity/route.ts`**

| Method | Action |
|--------|--------|
| GET    | List all non-deleted custom activities for the family, including their fields |
| POST   | Create a new custom activity (name, icon, color, sortOrder) |
| PUT    | Update a custom activity (by `?id=`) |
| DELETE | Soft-delete a custom activity (by `?id=`) |

**`/app/api/custom-activity/field/route.ts`**

| Method | Action |
|--------|--------|
| POST   | Add a field to a custom activity |
| PUT    | Update a field (name, fieldType, unit, options, isRequired, sortOrder) |
| DELETE | Soft-delete a field |

### Custom Activity Logs

**`/app/api/custom-activity-log/route.ts`**

| Method | Action |
|--------|--------|
| GET    | List logs for a baby in a date range, with nested `fieldValues` |
| POST   | Create a log entry with field values in request body |
| PUT    | Update a log entry and its field values |
| DELETE | Soft-delete a log entry |

Response shape mirrors existing activity log responses for timeline compatibility:

```typescript
type CustomActivityLogResponse = {
  id: string;
  familyId: string;
  babyId: string;
  caretakerId: string;
  customActivityId: string;
  customActivity: { id: string; name: string; icon: string; color: string };
  time: string; // ISO string
  notes: string | null;
  fieldValues: Array<{
    id: string;
    customActivityFieldId: string;
    field: { name: string; fieldType: CustomFieldType; unit: string | null };
    value: string;
  }>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
```

---

## Settings UI — Custom Activity Builder

### Location

New tab/section in the existing family settings panel. The entry point is a "Custom Activities" card alongside the existing activity visibility settings.

### Page: `CustomActivitySettings`

**File:** `src/components/settings/CustomActivitySettings/index.tsx`

- Lists all custom activities for the family
- "Add Activity" button opens `CustomActivityModal` in create mode
- Each activity row has an edit button (opens modal in edit mode) and a delete button
- Drag-to-reorder for sort order (or up/down arrows for accessibility)

### Modal: `CustomActivityModal`

**File:** `src/components/modals/CustomActivityModal/index.tsx`

Two-section form:

**Section 1 — Activity Identity**
- Name (text input, required)
- Icon (emoji picker or a curated icon grid)
- Color (color swatch picker with ~12 preset options)

**Section 2 — Fields**
- List of configured fields with edit/delete per row
- "Add Field" button opens `CustomFieldModal` inline

### Modal: `CustomFieldModal`

**File:** `src/components/modals/CustomActivityModal/CustomFieldModal.tsx`

Fields:
- Label (text, required) — e.g., "Amount"
- Type (select): Number | Text | Duration | Yes/No | Select List
- Unit (text, optional, shown for Number type) — e.g., "mL", "oz"
- Options (shown for Select List type) — tag input to add/remove string options
- Required toggle

---

## Log Entry UI — Custom Activity Form

### Location

The existing "+" / add activity flow. Custom activities appear in the activity selector alongside built-in types.

### Component: `CustomActivityForm`

**File:** `src/components/forms/CustomActivityForm/index.tsx`

Dynamically renders fields based on the selected custom activity definition:

| Field Type | UI Control |
|------------|-----------|
| NUMBER     | Number input with unit label suffix (e.g., "mL") |
| TEXT       | Text input |
| BOOLEAN    | Toggle/checkbox labeled with field name |
| DURATION   | Duration input (minutes/seconds, matching existing `TimerInput`) |
| SELECT     | Dropdown populated from field options |

Standard fields present on all entries: time picker, baby selector (if multi-baby), notes.

---

## Timeline Integration

### Activity Detection (`src/components/Timeline/utils.tsx`)

Add a new branch to the activity type detection:

```typescript
// Custom activity: has 'customActivityId' property
if ('customActivityId' in activity) return 'customActivity';
```

Add to `getActivityIcon`, `getActivityStyle`, `getActivityDescription` helpers:

- **Icon**: Use `customActivity.icon` (emoji) from the nested activity definition
- **Style/Color**: Use `customActivity.color`
- **Description**: Render each field value with its label and unit (e.g., "Amount: 120 mL")

### Full Log Timeline (`src/components/FullLogTimeline/`)

- `FullLogFilter.tsx`: Add custom activity types to the filter list (dynamic, fetched from API)
- `FullLogActivityDetails.tsx`: Add a case to render custom activity detail view showing all field values
- `FullLogActivityList.tsx`: Ensure custom activity entries are included in the unified fetch

The timeline/full-log currently fetches each activity type separately and merges them by date. Add a fetch for `GET /api/custom-activity-log` and include results in the merge.

---

## Localization

All new user-facing strings go into `en.json` first, then run `node scripts/check-missing-translations.js`. Key strings to add:

- `'Custom Activities'`
- `'Add Activity'`
- `'Activity Name'`
- `'Add Field'`
- `'Field Type'`
- `'Field Label'`
- `'Unit'` (e.g., mL, oz)
- `'Options'`
- `'Required'`
- `'Number'`, `'Text'`, `'Duration'`, `'Yes/No'`, `'Select List'`
- `'No custom activities yet'`

---

## Implementation Order

1. **Schema + migration** — Add 4 new models and 1 new enum; run migration
2. **API types** (`app/api/types.ts`) — Add `CustomActivityLogResponse` and related types
3. **API routes** — `custom-activity`, `custom-activity/field`, `custom-activity-log`
4. **Settings UI** — `CustomActivitySettings`, `CustomActivityModal`, `CustomFieldModal`
5. **Settings page wiring** — Add Custom Activities section to the settings page
6. **Form** — `CustomActivityForm` with dynamic field rendering
7. **Activity selector** — Add custom activities to the "add entry" activity picker
8. **Timeline integration** — Detection, icon/style/description helpers, fetch merge
9. **Full log integration** — Filter support, detail view
10. **Localization** — Add all strings to `en.json`, run translation script

---

## Per-Baby Visibility of Custom Activities

### Problem

The existing `activitySettings` JSON stores visibility/order under `"global"` and per-caretaker keys. There is no per-baby key. A family with multiple babies may want to track "Tummy Time Log" only for the newborn and "Homework Help" only for the toddler — custom activities need baby-scoped visibility independent of caretaker-scoped visibility.

### Schema Change

No new database model is needed. Extend the existing `ActivitySettings` JSON shape already stored in `Settings.activitySettings`:

```typescript
// Extended shape — existing keys unchanged, new "baby-<id>" keys added
{
  "global": { "order": [...], "visible": [...] },
  "caretaker-<id>": { "order": [...], "visible": [...] },
  "baby-<id>": { "visible": ["custom-<activityId>", "custom-<activityId2>"] }
}
```

Baby-scoped entries store only `visible` (no `order` — babies don't have an ordering context). They apply only to custom activities; built-in activity visibility is unaffected by baby-scoped keys.

### Lookup Priority

When resolving which custom activities to show for a given (caretaker, baby) pair:

1. Start with the global custom activity list (all non-deleted `CustomActivity` records for the family).
2. Filter to those visible in `global` settings (or all, if key absent).
3. Filter to those visible in `baby-<babyId>` settings (or all custom activities, if key absent — default is all visible).
4. Intersect with `caretaker-<caretakerId>` visible list if present.

### API Changes

**`GET /api/activity-settings?babyId=optional`** — extend to accept `babyId`. Response includes `babySettings` alongside existing `caretakerSettings` and `globalSettings`.

**`POST /api/activity-settings`** — accept `{ babyId?, caretakerId?, settings: { visible: string[] } }`. When `babyId` is present, write to the `baby-<babyId>` key.

### UI

In `CustomActivitySettings`, add a per-baby toggle grid:

- Rows = custom activity names
- Columns = babies in the family
- Each cell is a toggle (on = visible for that baby)
- A "Global" column covers families with one baby or as a default

The baby toggle grid lives below the activity list in the settings panel, not inside the activity builder modal.

---

## Export of Custom Activity Data

### Integration with Existing Export

The existing timeline export (`GET /api/timeline/export`) produces a flat CSV with a fixed column set: Date, Time, Activity Type, Sub-Type, Start Time, End Time, Duration, Amount, Unit, Details, Notes, Caretaker.

Custom activities are heterogeneous — each has its own fields — so they cannot be flattened into that fixed schema cleanly. Two export paths:

**Path A — Flat timeline export (minimal change)**

Custom activity entries are included in the unified flat CSV export. Each entry maps as:
- Activity Type → custom activity name (e.g., "Tummy Time Log")
- Sub-Type → blank
- Details → all field values serialized as `Label: value unit; Label2: value2` (semicolon-separated)
- All other columns as normal

This is the minimum change: one branch in the timeline export activity-detection logic. Done in `app/api/timeline/export/route.ts`.

**Path B — Per-custom-activity CSV (new endpoint)**

`GET /api/custom-activity-log/export?customActivityId=<id>&babyId=<id>&startDate=&endDate=&format=csv`

Produces a CSV where each column is a field in that specific custom activity definition, plus Date, Time, Notes, Caretaker. Column headers are dynamic (field names + unit suffix). This makes the export actually useful for analysis in a spreadsheet.

### Plan

Implement both paths:

1. **Path A** in the existing export route — lowest effort, ensures custom activities appear in the general timeline export immediately.
2. **Path B** as a new `app/api/custom-activity-log/export/route.ts` — provides a clean, per-activity-type export.

**`createDataExport`** in `csv-export.ts` is also extended to include all `CustomActivityLog` data when doing a full family data export.

### UI

In the Reports / export panel, when custom activities exist:
- The "Activity Type" filter dropdown includes each custom activity by name
- Selecting a custom activity type and exporting triggers Path B (the per-activity-type CSV)
- Selecting "All" continues to use Path A (flat CSV with Details column)

---

## Custom Activity Reminders/Alerts

### Overview

Allow families to configure time-based reminders on custom activities — e.g., "alert us if 'Medication' hasn't been logged in 8 hours." This mirrors the existing `feedWarningTime` / `diaperWarningTime` system but is defined per-activity, not per-baby.

### Schema Change

Add two optional fields to `CustomActivity`:

```prisma
model CustomActivity {
  // ... existing fields ...
  reminderEnabled       Boolean  @default(false)
  reminderIntervalHours Int?     // null = no reminder; e.g. 8 = alert after 8 hours without a log
}
```

No separate `CustomActivityReminder` model is needed — the interval lives on the activity definition itself, same as `feedWarningTime` on `Baby`.

### Timer Check Extension (`src/lib/notifications/timerCheck.ts`)

Add a new check function `checkCustomActivityTimers()` that runs alongside the existing feed/diaper/medicine checks:

1. Query all `CustomActivity` records where `reminderEnabled = true` and `reminderIntervalHours IS NOT NULL`.
2. For each, query the most recent `CustomActivityLog` per baby in the family (where `deletedAt IS NULL`).
3. Compare `now - mostRecentLog.time` against `reminderIntervalHours * 60`.
4. If overdue, send a notification using `sendNotificationWithLogging()` with:
   - Title: baby name
   - Body: `"{activityName} is overdue — last logged X hours ago"`
5. Deduplication via `NotificationPreference.lastTimerNotifiedAt` and `timerIntervalMinutes`.

A new `NotificationEventType` enum value is needed: `CUSTOM_ACTIVITY_TIMER_EXPIRED`.

The `NotificationPreference` records for custom activity timers follow the same structure as existing timer preferences, with `activityTypes` set to the custom activity ID string.

### UI — Reminder Configuration

In the `CustomActivityModal` (activity builder), a "Reminders" section at the bottom:

- Toggle: "Enable reminder"
- When enabled: number input "Remind after X hours without a log entry" (integer 1–72)
- This maps directly to `reminderEnabled` and `reminderIntervalHours`

In the Notifications settings (wherever users configure push notification preferences), a new section lists all custom activities that have `reminderEnabled = true`, allowing caretakers to opt in/out per custom activity, just like they do for feed/diaper/medicine timers today.

---

## System-Admin Visibility of Family Custom Activities

### Goal

System admins using the `/family-manager` panel can see which custom activities each family has defined and basic usage stats (how many log entries exist). This is read-only — admins cannot create or delete a family's custom activities, only view them for support purposes.

### New Page: `/app/family-manager/custom-activities/page.tsx`

A table view listing all families that have at least one custom activity defined:

| Family | Activity Name | Fields | Log Count | Last Entry | Active |
|--------|--------------|--------|-----------|------------|--------|
| Smith Family | Tummy Time | 2 | 47 | 2026-06-27 | Yes |
| Smith Family | Medication Log | 3 | 12 | 2026-06-26 | Yes |

Filtering: search by family name or activity name. Sortable columns.

### New API Endpoint: `GET /api/family/custom-activities` (sysadmin only, `withAdminAuth`)

Returns:
```typescript
type SysAdminCustomActivityView = {
  familyId: string;
  familyName: string;
  familySlug: string;
  customActivities: Array<{
    id: string;
    name: string;
    icon: string;
    isActive: boolean;
    fieldCount: number;
    logCount: number;
    lastEntryAt: string | null;
  }>;
};
```

The query uses `_count` on `CustomActivityLog` and `CustomActivityField` (Prisma aggregate) to avoid loading all log records.

### Family Detail Enhancement

In the existing family-manager family list, add a "Custom Activities" column showing the count of active custom activities for that family. Clicking the count links to the new custom-activities page filtered to that family.

---

## Push Notification Integration for Custom Activities

### How Existing Notifications Work

`notifyActivityCreated(babyId, activityType, actingUser, activityData)` is called from each API route's POST handler. It:
1. Looks up all `NotificationPreference` records for the baby.
2. Filters to those subscribed to `ACTIVITY_CREATED` events.
3. Filters by `activityTypes` (if set; null = all types).
4. Builds a localized notification body using a per-type message template.
5. Sends via `sendNotificationWithLogging()`.

### Integration Plan

**Step 1 — Call site in `custom-activity-log/route.ts` POST handler**

After creating a `CustomActivityLog`, call:
```typescript
await notifyActivityCreated(babyId, `custom:${customActivityId}`, actingUser, {
  customActivityName: customActivity.name,
  customActivityIcon: customActivity.icon,
  fieldValues: createdLog.fieldValues,
});
```

The `activityType` string uses a `custom:` prefix so existing preferences with `activityTypes: null` (all types) include it automatically, while preferences that list specific types can opt in to specific custom activities by ID.

**Step 2 — Notification body in `activityHook.ts`**

Extend the activity-type-to-body mapping to handle the `custom:` prefix:

```typescript
if (activityType.startsWith('custom:')) {
  const { customActivityName, customActivityIcon, fieldValues } = activityData;
  // Build summary: first 2 non-null field values
  const summary = fieldValues.slice(0, 2)
    .map(fv => `${fv.field.name}: ${fv.value}${fv.field.unit ? ' ' + fv.field.unit : ''}`)
    .join(', ');
  return `${customActivityIcon} ${customActivityName}${summary ? ` — ${summary}` : ''}`;
}
```

Localization: the notification body for custom activities does not go through the translation system — it uses the family-defined field names and values directly, which are already in the family's chosen language.

**Step 3 — Notification Preferences UI**

In the notifications settings panel, under "Activity Logged" preferences, include custom activities by name alongside built-in types. Users can toggle notifications for specific custom activities the same way they toggle "Feed", "Sleep", etc.

The subscription preference stores the custom activity ID in the `activityTypes` JSON array (e.g., `["custom:clx1234...", "feed", "sleep"]`).

---

## Updated Implementation Order

The original 10 steps remain. These additional features slot in after the core implementation:

11. **Per-baby visibility** — Extend `ActivitySettings` JSON shape, update GET/POST API, add baby toggle grid to `CustomActivitySettings`
12. **Push notifications** — Add `notifyActivityCreated` call in `custom-activity-log` POST, extend `activityHook.ts` body builder, add custom activities to notification preferences UI
13. **Reminders** — Add `reminderEnabled`/`reminderIntervalHours` to schema, extend `timerCheck.ts`, add new `NotificationEventType`, add reminder config to `CustomActivityModal`, add to notification preferences UI
14. **Export (Path A)** — Add custom activity branch to `app/api/timeline/export/route.ts` flat CSV
15. **Export (Path B)** — New `app/api/custom-activity-log/export/route.ts` with dynamic columns; wire up in Reports UI
16. **Export (full family)** — Extend `createDataExport` in `csv-export.ts` to include custom activity data
17. **Sysadmin panel** — New `GET /api/family/custom-activities` endpoint and `/family-manager/custom-activities/page.tsx`
18. **Docker support** — Multi-stage `Dockerfile`, `docker-compose.yml`, `.dockerignore` for self-hosting (SQLite and PostgreSQL)
19. **Home Assistant addon** — `hassio-addon/` (config.yaml, run.sh, Dockerfile) so Sprout Track can run as an HA addon

---

## Home Assistant Integration

### Option 1 — REST API + API keys (existing)

Sprout Track already exposes an `ApiKey` model and external endpoints. Home Assistant can call these directly with a scoped API key (e.g. a nursery button that logs a feed). This is the inbound path: HA → Sprout Track.

### Option 2 — Outbound webhook (push from Sprout Track to HA)

For the reverse direction (Sprout Track → HA), an **outbound webhook** is added so external systems can react to activity events in real time.

**Schema (`Settings`):**

```prisma
outboundWebhookUrl     String?   // Home Assistant / external webhook URL
outboundWebhookEnabled Boolean   @default(false)
outboundWebhookSecret  String?   // Optional HMAC secret for payload signing
```

**Utility (`src/lib/webhooks/outbound.ts`):**

`dispatchOutboundWebhook(familyId, event, data)` POSTs `{ event, timestamp, familyId, data }` to the configured URL. When a secret is set, an `X-Sprout-Signature` header carries the HMAC-SHA256 of the JSON body. The function never throws — it is called fire-and-forget from API handlers.

**Wiring:** the `custom-activity-log` POST handler dispatches a `custom_activity_created` event. A `test` event can be sent from the settings UI via `POST /api/settings/webhook-test`.

**UI:** an "Integrations" section in the settings panel exposes the URL, enable toggle, optional secret, and a Test button.

---

## Docker & Self-Hosting

A `Dockerfile`, `docker-compose.yml`, and `docker-startup.sh` provide a self-hosting path supporting both SQLite (default) and PostgreSQL via the `DATABASE_PROVIDER` env var. The startup script runs `prisma migrate deploy`, pushes the log schema, seeds, and (optionally) starts the notification cron daemon.

A Home Assistant addon under `hassio-addon/` (`config.yaml`, `run.sh`, `Dockerfile`) builds the app and persists the SQLite DB under HA's `/share/sprout-track` volume. Addon options map `auth_life`, `idle_time`, and `enable_notifications` to environment variables.

---

## Cloudflare Tunnel + Access Integration

### Overview

Two capabilities are added together:

1. **Cloudflare Tunnel (cloudflared)** — Exposes the app to the internet over a secure outbound tunnel without opening inbound firewall ports. The cloudflared daemon runs as a sidecar container in `docker-compose.yml`.

2. **Cloudflare Access (Google SSO)** — Cloudflare Access sits in front of the tunnel and enforces Google OAuth before any request reaches the app. After authentication, Cloudflare injects a signed JWT (`CF_Authorization` cookie + `Cf-Access-Jwt-Assertion` header) on every request.

3. **PIN bypass** — When Cloudflare Access is configured, Account holders (email-based auth) can skip the PIN entry step. The app validates the Cloudflare JWT, looks up the Account by email, and issues an app session token automatically. Caretaker PIN auth is unaffected.

---

### How Cloudflare Access Works (Request Flow)

```
Browser → Cloudflare Edge
  → (not authenticated) Google OAuth → CF Access JWT issued
  → (authenticated) Request + CF_Authorization cookie → Tunnel → App container
```

After Google auth, every request carries:
- `CF_Authorization` cookie — the signed CF Access JWT (HttpOnly, set by Cloudflare)
- `Cf-Access-Jwt-Assertion` header — same JWT as a header

The JWT is signed with Cloudflare's private key. The app verifies the signature against Cloudflare's JWKS endpoint (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`) and validates the `aud` (audience) claim against the configured policy AUD tag.

---

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_TUNNEL_TOKEN` | Yes | Tunnel token from `cloudflared tunnel create` or the Zero Trust dashboard |
| `CLOUDFLARE_ACCESS_TEAM_DOMAIN` | Yes | Your team domain, e.g. `myteam.cloudflareaccess.com` |
| `CLOUDFLARE_ACCESS_AUDIENCE` | Yes | The AUD tag from your Cloudflare Access application policy |
| `CLOUDFLARE_ACCESS_SKIP_PIN` | No | `true` to enable auto-login for CF-authenticated accounts (default `false`) |
| `CLOUDFLARE_ACCESS_AUTO_CREATE` | No | `true` to auto-create an Account when the email isn't found (default `false`) |

---

### Docker Compose Changes (`docker-compose.yml`)

Add a `cloudflared` sidecar service:

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  restart: unless-stopped
  command: tunnel --no-autoupdate run
  environment:
    - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
  depends_on:
    - app
```

The tunnel connects to the `app` service on port 3000. No ingress port mapping is needed on the `app` service for external traffic — cloudflared handles it.

---

### New Files

#### `src/lib/cloudflare-access.ts`

Utility for validating Cloudflare Access JWTs:

- `getCloudflarePublicKeys(teamDomain)` — fetches and caches JWKS from Cloudflare (cached for 5 minutes in memory)
- `validateCloudflareJwt(token, teamDomain, audience)` — verifies signature, expiry, and `aud` claim; returns decoded payload `{ email, sub }` or throws
- Uses Node.js `crypto` (no external JWT library needed beyond what already exists in the project)

#### `app/api/auth/cloudflare/route.ts`

`POST /api/auth/cloudflare` — called client-side when the CF cookie is detected.

1. Reads `CF_Authorization` cookie (or `Cf-Access-Jwt-Assertion` header as fallback)
2. Returns 501 if `CLOUDFLARE_ACCESS_SKIP_PIN` is not `true`
3. Validates the JWT via `validateCloudflareJwt()`
4. Looks up `Account` by `email` (case-insensitive)
5. If not found and `CLOUDFLARE_ACCESS_AUTO_CREATE=true`: creates Account with a random secure PIN (PIN-less login only; the user can set a PIN later in settings)
6. If not found and auto-create is off: returns 403 with `{ error: 'no_account' }`
7. On success: generates and returns an app JWT (same format as `/api/auth`) with the account's family context

No rate-limiting needed on this endpoint — Cloudflare Access already enforces authentication before the request reaches the app.

---

### Client-Side Auto-Login

**File:** `app/(app)/page.tsx` or the family-select/login client component

On page load (before showing the PIN entry UI):
1. Check if `CF_Authorization` cookie is present (readable as a non-HttpOnly copy, or detected via a lightweight `/api/auth/cloudflare/check` GET endpoint that returns `{ available: true/false }`)
2. If `CLOUDFLARE_ACCESS_SKIP_PIN` is enabled server-side and the cookie is present, POST to `/api/auth/cloudflare`
3. On success: store the returned `authToken` in localStorage and navigate to the app (bypassing PIN entry entirely)
4. On `403 no_account`: show a message — "No Sprout Track account found for your Google account. Contact your family admin."
5. On failure: fall through to normal PIN entry (graceful degradation)

The check and redirect complete before the PIN UI renders, so users with CF Access configured never see the PIN form.

---

### Account Mapping

- The Cloudflare email must exactly match an `Account.email` in the database (case-insensitive lookup)
- Accounts are created normally via the existing registration flow or the family manager
- If `CLOUDFLARE_ACCESS_AUTO_CREATE=true`: a new Account is created with the CF email, assigned to the first (or only) family in the database, with role `CARETAKER`. If the instance is multi-family SaaS, auto-create is disabled regardless of the env var.

---

### Caretaker PIN Auth — Unchanged

Caretaker PIN auth (the 6-digit family PIN) is completely separate from Account auth. CF Access does not bypass caretaker PINs — those users still enter their PIN as before. Only Account holders (email-based auth) benefit from the CF auto-login.

---

### Cloudflare Access Setup (User Steps)

Documented in `README.md` under a new "Cloudflare Tunnel" section:

1. Create a tunnel: `cloudflared tunnel create sprout-track`
2. Copy the tunnel token to `CLOUDFLARE_TUNNEL_TOKEN` in your `.env`
3. In Cloudflare Zero Trust dashboard:
   - Create a self-hosted application pointing to your domain
   - Add Google as an identity provider
   - Create a policy (e.g., allow specific emails or a Google Workspace domain)
   - Copy the **AUD tag** to `CLOUDFLARE_ACCESS_AUDIENCE`
   - Copy your **team domain** to `CLOUDFLARE_ACCESS_TEAM_DOMAIN`
4. Set `CLOUDFLARE_ACCESS_SKIP_PIN=true` in your `.env`
5. Run `docker compose up -d`

---

### Tunnel Deployment Options

The app does not need to run cloudflared itself — it only needs to receive requests that Cloudflare Access has already validated. Two supported deployment modes:

**Option A — Docker sidecar (standalone)**

Add a `cloudflared` service to `docker-compose.yml`. The tunnel is authenticated with a `CLOUDFLARE_TUNNEL_TOKEN` env var. The sidecar connects to the `app` container on port 3000 and forwards traffic.

```yaml
cloudflared:
  image: cloudflare/cloudflared:latest
  restart: unless-stopped
  command: tunnel --no-autoupdate run
  environment:
    - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
  depends_on:
    - app
```

This is for users running Sprout Track in a standalone Docker environment (VPS, NAS, etc.).

**Option B — Home Assistant cloudflared addon**

Users who already have Home Assistant running with the [Cloudflare addon](https://github.com/brenner-tobias/addon-cloudflared) can route Sprout Track through HA's existing tunnel instead of running a second cloudflared instance. The setup is purely in the Cloudflare Zero Trust dashboard — add a new public hostname pointing to `http://<sprout-track-host>:3000` on the same tunnel HA already uses. No changes to Sprout Track's Docker config are required.

The `docker-compose.yml` ships with the sidecar service commented out and a comment explaining Option B for HA users.

---

### Implementation Order (slots after step 19)

20. **Cloudflare JWT utility** — `src/lib/cloudflare-access.ts` (JWKS fetch + cache, JWT verify)
21. **Auto-login API** — `app/api/auth/cloudflare/route.ts` (validate CF JWT → return app token)
22. **Client-side auto-login** — Detect CF cookie on login/family-select page, call endpoint, bypass PIN
23. **Docker Compose** — Add `cloudflared` sidecar service (commented out by default); add Option A/B explanation
24. **Documentation** — Add Cloudflare Tunnel setup section to `README.md` covering both options, env var table to `.env.example`

---

## MDI Icon System

### Overview

Replace the `lucide-react` icon library (used in ~145 files across the app) with [Material Design Icons](https://materialdesignicons.com/) via `@mdi/react` + `@mdi/js`. Additionally, replace the emoji text input in the custom activity builder with a curated MDI icon picker grid.

---

### Why MDI

- 7,000+ icons covering every concept in the app (including baby-specific ones like `mdiBabyBottle`, `mdiBreastfeeding`, `mdiBabyFaceOutline`)
- Tree-shakeable via `@mdi/js` — only imported paths land in the bundle
- Consistent 24px grid design; no visual mismatch between icons
- Single dependency replacing two (`lucide-react` + `@lucide/lab`)

---

### Packages

```bash
npm install @mdi/react @mdi/js
npm uninstall lucide-react @lucide/lab
```

`@mdi/js` exports every icon as a named SVG path string (`mdiPlus`, `mdiTrashCan`, etc.). `@mdi/react` provides the `<Icon path={...} size={1} />` React component. Size `1` = 24px (matching Lucide's default).

---

### Shared Icon Wrapper (`src/components/ui/icon/`)

A thin wrapper around `@mdi/react` that enforces consistent sizing and applies the correct color in dark mode without needing per-icon CSS overrides:

```tsx
// src/components/ui/icon/index.tsx
import MdiIcon from '@mdi/react';

interface IconProps {
  path: string;
  size?: number | string;  // default 1 (24px)
  className?: string;
  spin?: boolean;
}

export function Icon({ path, size = 1, className, spin }: IconProps) {
  return <MdiIcon path={path} size={size} className={className} spin={spin} />;
}
```

The wrapper accepts `className` so Tailwind color utilities (`text-red-500`, `text-gray-400`, etc.) work the same way they do with Lucide today. SVG `currentColor` picks up the CSS color automatically.

For the spinning loader (replacing `<Loader2 className="animate-spin" />`):
```tsx
<Icon path={mdiLoading} spin />
```

---

### Lucide → MDI Icon Map

Complete mapping of the ~90 Lucide icons used in the app:

| Lucide | MDI | Notes |
|--------|-----|-------|
| `Activity` | `mdiHumanRunning` | |
| `AlertCircle` | `mdiAlertCircle` | |
| `AlertTriangle` | `mdiAlert` | |
| `ArrowDown` | `mdiArrowDown` | |
| `ArrowDownUp` | `mdiArrowUpDown` | |
| `ArrowLeft` | `mdiArrowLeft` | |
| `ArrowLeftRight` | `mdiArrowLeftRight` | |
| `ArrowRight` | `mdiArrowRight` | |
| `ArrowUp` | `mdiArrowUp` | |
| `ArrowUpCircle` | `mdiArrowUpCircle` | |
| `Baby` | `mdiBabyFaceOutline` | |
| `BarChart3` | `mdiChartBar` | |
| `Bath` | `mdiBath` | |
| `BedDouble` | `mdiBed` | |
| `Bell` | `mdiBell` | |
| `BellOff` | `mdiBellOff` | |
| `Briefcase` | `mdiBriefcase` | |
| `Calendar` | `mdiCalendar` | |
| `CalendarClock` | `mdiCalendarClock` | |
| `Check` | `mdiCheck` | |
| `CheckCircle` | `mdiCheckCircle` | |
| `ChevronDown` | `mdiChevronDown` | |
| `ChevronLeft` | `mdiChevronLeft` | |
| `ChevronRight` | `mdiChevronRight` | |
| `ChevronUp` | `mdiChevronUp` | |
| `ChevronsLeft` | `mdiChevronDoubleLeft` | |
| `ChevronsRight` | `mdiChevronDoubleRight` | |
| `Circle` | `mdiCircle` | |
| `CircleDot` | `mdiCircleSlice8` | |
| `ClipboardList` | `mdiClipboardList` | |
| `Clock` | `mdiClockOutline` | |
| `Coffee` | `mdiCoffee` | |
| `Copy` | `mdiContentCopy` | |
| `CreditCard` | `mdiCreditCard` | |
| `Crown` | `mdiCrown` | |
| `Download` | `mdiDownload` | |
| `Droplet` | `mdiWater` | |
| `Edit` | `mdiPencil` | |
| `ExternalLink` | `mdiOpenInNew` | |
| `Eye` | `mdiEye` | |
| `EyeOff` | `mdiEyeOff` | |
| `FileDown` | `mdiFileDownload` | |
| `FileText` | `mdiFileDocument` | |
| `Github` | `mdiGithub` | |
| `Grid3X3` | `mdiGrid` | |
| `GripVertical` | `mdiDragVertical` | |
| `HeartPulse` | `mdiHeartPulse` | |
| `Home` | `mdiHome` | |
| `ImagePlus` | `mdiImagePlus` | |
| `Key` | `mdiKey` | |
| `KeyRound` | `mdiKeyVariant` | |
| `LampWallDown` | `mdiBreastfeeding` | Used for pumping/nursing |
| `Loader2` | `mdiLoading` | Use `spin` prop |
| `LogOut` | `mdiLogout` | |
| `Mail` | `mdiEmail` | |
| `MapPin` | `mdiMapMarker` | |
| `Menu` | `mdiMenu` | |
| `MessageSquare` | `mdiMessageText` | |
| `Minus` | `mdiMinus` | |
| `Monitor` | `mdiMonitor` | |
| `Moon` | `mdiMoonWaningCrescent` | |
| `Pause` | `mdiPause` | |
| `Pencil` | `mdiPencil` | |
| `Phone` | `mdiPhone` | |
| `Pill` | `mdiPill` | |
| `PillBottle` | `mdiBottleTonicPlus` | |
| `Play` | `mdiPlay` | |
| `Plus` | `mdiPlus` | |
| `PlusCircle` | `mdiPlusCircle` | |
| `RefreshCw` | `mdiRefresh` | |
| `Repeat` | `mdiRepeat` | |
| `RotateCcw` | `mdiRotateLeft` | |
| `RotateCw` | `mdiRotateRight` | |
| `Ruler` | `mdiRuler` | |
| `Save` | `mdiContentSave` | |
| `Scale` | `mdiScale` | |
| `Search` | `mdiMagnify` | |
| `Send` | `mdiSend` | |
| `Settings` | `mdiCog` | |
| `Share` | `mdiShareVariant` | |
| `Shield` | `mdiShield` | |
| `Square` | `mdiSquare` | |
| `Star` | `mdiStar` | |
| `StickyNote` | `mdiNoteText` | |
| `Sun` | `mdiWhiteBalanceSunny` | |
| `Syringe` | `mdiSyringe` | |
| `Thermometer` | `mdiThermometer` | |
| `Timer` | `mdiTimer` | |
| `Trash2` | `mdiTrashCan` | |
| `TrendingUp` | `mdiTrendingUp` | |
| `Trophy` | `mdiTrophy` | |
| `Upload` | `mdiUpload` | |
| `User` | `mdiAccount` | |
| `UserCircle` | `mdiAccountCircle` | |
| `Users` | `mdiAccountGroup` | |
| `Utensils` | `mdiSilverwareForkKnife` | |
| `Wrench` | `mdiWrench` | |
| `X` | `mdiClose` | |
| `XCircle` | `mdiCloseCircle` | |
| `ZoomIn` | `mdiMagnifyPlus` | |
| `ZoomOut` | `mdiMagnifyMinus` | |
| `diaper` (lab) | `mdiDiaper` | MDI has this natively |
| `bottleBaby` (lab) | `mdiBabyBottle` | MDI has this natively |

---

### Migration Strategy

The migration is mechanical but large (~145 files). It proceeds component-by-component rather than in one pass to keep PRs reviewable:

1. **Install packages** — add `@mdi/react` + `@mdi/js`, keep `lucide-react` temporarily so the build doesn't break mid-migration
2. **Create the Icon wrapper** — `src/components/ui/icon/index.tsx`
3. **Migrate UI primitives first** (`src/components/ui/`) — these are imported everywhere; migrating them fixes many downstream consumers automatically
4. **Migrate feature components** (`src/components/`) — forms, modals, settings, timeline, etc.
5. **Migrate app pages** (`app/`) — layout, log-entry, full-log, family-manager, etc.
6. **Remove `lucide-react` and `@lucide/lab`** — after all imports are gone, uninstall both packages
7. **Audit** — `grep -r "lucide-react" .` should return zero results

Each step is a separate commit. TypeScript compilation confirms nothing is missed — `LucideIcon` types are replaced with `string` (the MDI path) or the `Icon` wrapper props type.

---

### Custom Activity Icon Picker

**Current**: a plain text `<Input>` where users type an emoji character.

**New**: a scrollable icon picker grid showing ~150 curated MDI icons grouped by category. Clicking an icon selects it; the selected icon is shown in the `ActivityTile` preview at the top of the modal.

**Storage**: `CustomActivity.icon` changes from an emoji string (e.g., `"⭐"`) to an MDI icon name string (e.g., `"mdiStar"`). A migration is not needed for existing rows — the display layer checks: if the stored string starts with `mdi`, render it as an MDI icon; otherwise render it as emoji text (backward compat for any existing emoji icons).

**Curated icon set** (`src/constants/custom-activity-icons.ts`):

```ts
import {
  mdiBabyBottle, mdiBabyFaceOutline, mdiBottleTonicPlus, mdiPill, ...
} from '@mdi/js';

export const CUSTOM_ACTIVITY_ICON_GROUPS = [
  {
    label: 'Baby & Feeding',
    icons: [
      { name: 'mdiBabyBottle', path: mdiBabyBottle },
      { name: 'mdiBabyFaceOutline', path: mdiBabyFaceOutline },
      { name: 'mdiBreastfeeding', path: mdiBreastfeeding },
      { name: 'mdiSpoonSugar', path: mdiSpoonSugar },
      { name: 'mdiCupWater', path: mdiCupWater },
      ...
    ],
  },
  {
    label: 'Health & Medical',
    icons: [
      { name: 'mdiPill', path: mdiPill }, { name: 'mdiBottleTonicPlus', path: mdiBottleTonicPlus },
      { name: 'mdiSyringe', path: mdiSyringe }, { name: 'mdiThermometer', path: mdiThermometer },
      { name: 'mdiHeartPulse', path: mdiHeartPulse }, { name: 'mdiScale', path: mdiScale },
      ...
    ],
  },
  {
    label: 'Activity & Play',
    icons: [
      { name: 'mdiHumanRunning', path: mdiHumanRunning }, { name: 'mdiSoccer', path: mdiSoccer },
      { name: 'mdiToyBrick', path: mdiToyBrick }, { name: 'mdiPuzzle', path: mdiPuzzle },
      { name: 'mdiSwim', path: mdiSwim }, { name: 'mdiBike', path: mdiBike },
      ...
    ],
  },
  {
    label: 'Sleep & Rest',
    icons: [
      { name: 'mdiBed', path: mdiBed }, { name: 'mdiMoonWaningCrescent', path: mdiMoonWaningCrescent },
      { name: 'mdiSleep', path: mdiSleep }, ...
    ],
  },
  {
    label: 'Learning',
    icons: [
      { name: 'mdiBook', path: mdiBook }, { name: 'mdiSchool', path: mdiSchool },
      { name: 'mdiPencil', path: mdiPencil }, { name: 'mdiPalette', path: mdiPalette },
      { name: 'mdiMusicNote', path: mdiMusicNote }, ...
    ],
  },
  {
    label: 'General',
    icons: [
      { name: 'mdiStar', path: mdiStar }, { name: 'mdiHeart', path: mdiHeart },
      { name: 'mdiClockOutline', path: mdiClockOutline }, { name: 'mdiCalendar', path: mdiCalendar },
      { name: 'mdiTrophy', path: mdiTrophy }, { name: 'mdiNoteText', path: mdiNoteText },
      ...
    ],
  },
];
```

**Picker component** (`src/components/ui/icon-picker/`):

- Tabs for each category group
- 6-column icon grid; each cell is a 40×40 button showing the MDI icon at `size={1}`
- Selected state: colored border + filled background (matching the activity color swatch)
- Search input filters icons by name across all groups
- Used inside `CustomActivityModal` in place of the emoji text input

**Display in tiles and timeline**: `ActivityTileGroup` and `activity-tile-icon.tsx` check `ca.icon.startsWith('mdi')` and render `<Icon path={icons[ca.icon]} size={2.5} />` (using `@mdi/js` name lookup). For backward-compatible emoji storage, render as `<span>{ca.icon}</span>`.

---

### Implementation Order (slots after step 24)

25. **Install packages** — add `@mdi/react` + `@mdi/js`
26. **Icon wrapper** — `src/components/ui/icon/index.tsx`
27. **Curated icon set constant** — `src/constants/custom-activity-icons.ts`
28. **Icon picker component** — `src/components/ui/icon-picker/` (tabs + grid + search)
29. **Custom activity modal** — swap emoji input for icon picker; update display in `ActivityTileGroup` and timeline icon
30. **Migrate UI primitives** — all files under `src/components/ui/`
31. **Migrate feature components** — forms, modals, settings, timeline, full-log, etc.
32. **Migrate app pages** — `app/` directory
33. **Remove Lucide** — uninstall `lucide-react` + `@lucide/lab`; verify with grep
