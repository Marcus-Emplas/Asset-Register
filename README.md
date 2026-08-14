# Asset Register Dashboard — Console Grid

A dark, console-styled IT asset register dashboard with authentication,
MFA, and role-based access. Tracks a fleet of devices (laptops, phones,
monitors, servers, etc.) with an overview of fleet health, a
searchable/filterable/sortable asset table, breakdown reports, a
deprecated/retired-assets report, and a detail drawer for day-to-day
asset lifecycle actions.

Node.js/Express backend, SQLite database, vanilla-JS frontend (no
frameworks, no build step, no bundler). Fonts are self-hosted.

## Features

- **Login + MFA** — email/password (12+ chars, upper/lower/number/special
  character required) plus mandatory TOTP two-factor authentication
  (Google Authenticator, Authy, etc.), enrolled via QR code on first login.
- **Roles** — `admin` and `standard`. Standard users can view everything
  and do day-to-day actions (check in/out, flag/mark repaired). Admins can
  additionally add/retire assets, run bulk actions, import CSV, and manage
  users.
- **Overview** — KPI tiles, an assets-by-type bar chart, an assets-by-status
  donut, and a "Needs Attention" feed.
- **Assets** — Paginated, sortable table with free-text search, filters,
  bulk selection (check-in/out, flag for repair, retire, export selected),
  and CSV export.
- **Reports** — Breakdown by type, location, and supplier, plus compliance
  stats.
- **Deprecated** — A dedicated view/report of retired assets: breakdown by
  type/location/supplier and a retirements-by-month timeline.
- **CSV Import** (admin) — Upload a CSV matching the export format; rows are
  previewed with validation errors (duplicate tags, missing fields) before
  committing.
- **User Management** (admin) — Create users, change roles, disable
  accounts, reset a user's MFA enrollment.
- **Detail drawer** — Full asset record and history log, with contextual
  actions.

## Running it locally

Requires Node.js ≥ 22.5 (uses the built-in `node:sqlite` module — no
native compilation needed).

```
npm install
npm run seed          # creates data/asset-register.db, seeds ~2,150 mock assets
npm start              # http://localhost:3000
```

To also seed a bootstrap admin account:

```
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='YourP@ssw0rd123' npm run seed
```

Copy `.env.example` to `.env` and set `SESSION_SECRET` to a long random
string before running in anything beyond local dev.

## Deploying on Ubuntu

1. Copy the repo to the server (e.g. `/opt/asset-register-dashboard`),
   install Node ≥ 22.5, then `npm install --omit=dev`.
2. Create `.env` from `.env.example` — set `NODE_ENV=production`, a real
   `SESSION_SECRET`, and `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` for the
   one-time seed.
3. Run `npm run seed` once.
4. Create a dedicated system user (`useradd -r -s /usr/sbin/nologin assetreg`),
   `chown -R assetreg:assetreg /opt/asset-register-dashboard`.
5. Install the systemd unit: copy `deploy/asset-register.service` to
   `/etc/systemd/system/`, then `systemctl daemon-reload && systemctl enable --now asset-register`.
6. Install the nginx reverse proxy: copy `deploy/nginx.conf.template` to
   `/etc/nginx/sites-available/asset-register`, edit `server_name`, symlink
   into `sites-enabled`, `nginx -t && systemctl reload nginx`, then run
   `certbot --nginx -d assets.yourdomain.com` for TLS.

## Project structure

```
server/
  index.js              Entrypoint
  app.js                Express app: middleware, session config, route mounting
  db/
    schema.sql           Table definitions (users, assets, asset_history, sessions)
    db.js                node:sqlite connection singleton
    seed.js               One-time mock-fleet + bootstrap-admin seed script
  middleware/
    auth.js               attachCurrentUser / requireAuth / requireRole
    rateLimit.js           Login + MFA brute-force rate limiting
  routes/
    auth.routes.js         login / mfa verify+enroll / logout / me
    assets.routes.js        CRUD, check-in-out, flag-repair, retire, bulk, import
    users.routes.js         admin user management
  lib/
    totp.js                 TOTP secret/QR/verify (otplib + qrcode)
    password.js             Password policy (server source of truth)
    assetMapper.js           DB row -> client Asset shape
deploy/
  asset-register.service   systemd unit
  nginx.conf.template       nginx reverse-proxy config
public/
  index.html               Page shell
  css/                     Layout, components, color tokens, animations
  fonts/                   IBM Plex Mono / IBM Plex Sans, self-hosted
  js/
    data.js                 Mock-data generator (reference for seed.js) + pure
                              helpers (summarize, filter/group, CSV export/import)
    api.js                   Thin fetch wrapper
    password.js               Client-side password-policy mirror (UX only)
    app.js                    App state, view-model computation, and rendering
```

## Design notes

The frontend is rendered by re-computing a plain-object "view model" from
state on every change (`App.computeViewModel()`), then stringifying it
into `innerHTML` via small template functions — a minimal, framework-free
version of the render-from-state pattern. Interactivity is handled with a
single set of delegated `click` / `input` / `change` listeners on the root
element, dispatched via `data-act` / `data-bind` attributes. Server state
(assets, users, sessions) lives in SQLite; the client fetches on load and
after each mutation rather than mutating local state directly.
