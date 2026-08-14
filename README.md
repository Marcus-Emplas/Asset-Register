# Asset Register Dashboard — Console Grid

A dark, console-styled IT asset register dashboard. Tracks a mock fleet of
2,150 devices (laptops, phones, monitors, servers, etc.) with an overview
of fleet health, a searchable/filterable/sortable asset table, breakdown
reports, and a detail drawer for day-to-day asset lifecycle actions.

Pure HTML, CSS, and vanilla JavaScript — no build step, no dependencies,
no network calls. Fonts are self-hosted, so the whole thing works fully
offline; just open `index.html` in a browser.

## Features

- **Overview** — KPI tiles (total, in use, in stock, in repair, blocked,
  pending return), an assets-by-type bar chart, an assets-by-status donut,
  and a "Needs Attention" feed (blocked devices, overdue/upcoming returns,
  repairs, unsigned agreements).
- **Assets** — Paginated, sortable table (25 rows/page) with free-text
  search (tag, model, serial, owner, location), status/type/location
  filters, and a CSV export of the current filtered view.
- **Reports** — Breakdown by type, location, and supplier, plus compliance
  stats (agreements signed, blocked devices, pending returns, unsigned
  agreements).
- **Detail drawer** — Full asset record (identification, network,
  assignment, lifecycle) and history log, with contextual actions:
  check in / check out, flag for repair, mark repaired, retire.
- **Add Asset** — Modal form with validation (duplicate tag detection,
  required fields).

All data is generated client-side with a seeded PRNG, so the register is
identical on every load but everything (checking assets in/out, retiring,
adding new assets) is fully interactive and persists for the session.

## Running it

No install, no server required:

```
open index.html          # macOS
# or just double-click index.html / drag it into a browser tab
```

If you'd rather serve it (e.g. to test relative paths exactly as they'd
behave in production), any static file server works:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```
index.html            Page shell — loads styles.css and the two JS files
css/
  styles.css           Layout, components, color tokens, animations
  fontface.css          @font-face declarations for the self-hosted fonts
fonts/                 IBM Plex Mono / IBM Plex Sans, woff2, self-hosted
js/
  data.js               Deterministic mock-data generator + pure helpers
                          (summarize, filter/group, CSV export, formatting)
  app.js                App state, view-model computation, and rendering
                          (vanilla DOM string templates + event delegation,
                          no framework)
```

## Design notes

The UI is rendered by re-computing a plain-object "view model" from state
on every change (`App.computeViewModel()`), then stringifying it into
`innerHTML` via small template functions — a minimal, framework-free
version of the render-from-state pattern. Interactivity is handled with a
single set of delegated `click` / `input` / `change` listeners on the root
element, dispatched via `data-act` / `data-bind` attributes, rather than
per-element handlers. Focus and cursor position are preserved across
re-renders so typing in the search box or the Add Asset form doesn't
stutter.
