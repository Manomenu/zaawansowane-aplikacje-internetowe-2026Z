# Design — the API behind the course contract

Decisions every part of the server follows. The contract (`docs/spec/zai-api-26z.yaml`) and the
teacher's tests (`docs/spec/zai-tests.mjs`) are the source of truth; this file says how we meet
them. Changing a decision here is a design change: say why in the progress file.

## Domain

Forest weather conditions, as a measured history for
[grzyby-mcp](https://github.com/Manomenu/grzyby-mcp): mushrooms fruit about 7–14 days after a
good rain, in wet and warm soil, and stop after a frost. Three places × four quantities = 12
series, one sensor (one API key) per series, hourly values:

| Quantity | Open-Meteo variable | Unit | Series range |
| --- | --- | --- | --- |
| Precipitation | `precipitation` | mm | 0 – 100 |
| Air temperature (2 m) | `temperature_2m` | °C | −40 – 45 |
| Soil temperature (6 cm) | `soil_temperature_6cm` | °C | −20 – 40 |
| Soil moisture (3–9 cm) | `soil_moisture_3_to_9cm` × 100 | % vol | 0 – 100 |

Places: Warsaw, Suwałki, Chełm. The "sensor" is the data generator (F13), which reads Open-Meteo
or makes a synthetic series and posts it through the API. The server never calls Open-Meteo.

## Routes and the `/api` prefix

Routes are declared **without** `/api` (the template's rule: the Vite proxy and nginx strip it).
Everything the client sees carries it, so the `Location` header is built from the setting
`public_api_prefix` (default `/api`): `Location: /api/series/12`.

## Database (PostgreSQL, plain SQL migrations)

`migrations/001_schema.sql` creates:

- `admins` — `id bigint identity PK`, `username text UNIQUE NOT NULL`, `password_hash text NOT
  NULL` (Argon2id), `created_at timestamptz`.
- `sessions` — `token_hash text PK` (SHA-256 hex of the opaque token), `admin_id → admins ON
  DELETE CASCADE`, `expires_at timestamptz NOT NULL`, `created_at`. Index on `expires_at`.
- `series` — `id bigint identity PK`, `name text NOT NULL CHECK (length 1–100)`, `min_value`
  and `max_value double precision NOT NULL CHECK (min_value < max_value)`, `color text NOT NULL
  CHECK (color ~ '^#[0-9A-Fa-f]{6}$')`, `icon text NULL`, `unit text NULL CHECK (length ≤ 20)`,
  `created_at`.
- `sensors` — `id bigint identity PK`, `name text NOT NULL CHECK (length 1–100)`, `series_id →
  series ON DELETE CASCADE`, `api_key_hash text UNIQUE NOT NULL` (SHA-256 hex), `created_at`,
  `last_measurement_at timestamptz NULL`. Index on `series_id`.
- `measurements` — `id bigint identity PK`, `series_id → series ON DELETE CASCADE NOT NULL`,
  `sensor_id → sensors ON DELETE SET NULL NULL`, `value double precision NOT NULL`, `measured_at
  timestamptz NOT NULL` (JSON field `timestamp`), `created_at`. Index `(series_id,
  measured_at)`.

Unregistering a sensor deletes its row: its key stops working at once, its measurements stay
with `sensor_id = NULL`. Deleting a series takes its sensors and measurements with it.

## Authentication

- **Admin:** `POST /auth/login` checks the Argon2id hash (`argon2-cffi`) and returns an opaque
  token (`secrets.token_urlsafe(32)`), stored only as SHA-256 in `sessions`, valid
  `token_ttl_seconds` (default 3600) — `expiresIn` in the response. Logout deletes the
  session; changing the password keeps the current session and deletes the others.
  Opaque tokens instead of JWT: logout must revoke at once (the contract tests it), which a
  stateless JWT cannot do without a blocklist — and then it is a session table anyway.
- **The first admin** is created at start-up from `ADMIN_USERNAME` and `ADMIN_PASSWORD` when
  the `admins` table is empty; nothing happens when they are unset or an admin exists.
- **Sensors:** `X-API-Key` → SHA-256 → `sensors.api_key_hash`. The key is
  `secrets.token_urlsafe(32)` (43 characters), returned only by `POST /sensors`.
- **No cookies.** The web app keeps the Bearer token in memory/`sessionStorage`; the cookie
  test (A4) passes because nothing sets a cookie.
- **Order:** authentication is checked before the body's validation, so an admin route without
  a token answers 401 whatever the body (the teacher's tests send valid bodies without a token).

## Errors: Problem Details everywhere

Every error is `application/problem+json` with `type` (`about:blank`), `title`, `status`,
`detail`, and for validation `errors: [{field, message}]`. Never a stack trace: an unhandled
exception is logged and answered with a bare 500 problem.

| Situation | Status |
| --- | --- |
| Body is not valid JSON | 400 |
| Body or query fails the schema (missing field, wrong type, pattern, length, bad `from`/`to`, bad `series` id list, `limit` out of range) | 400, with `errors` |
| A business rule (min ≥ max, value outside the series range, timestamp > now + 5 min, sensor for a series that does not exist) | 422, with `errors` |
| New series range would exclude stored measurements | 409 |
| No/invalid/expired token, no/invalid sensor key | 401 (+ `WWW-Authenticate: Bearer` for tokens) |
| Wrong current password on password change | 403 |
| Unknown resource | 404 |
| Method not allowed (e.g. `PUT /measurements/{id}`) | 405 |
| `Accept` that allows neither `application/json` nor `application/problem+json` (wildcards count) | 406 |
| `POST`/`PUT` with a body whose `Content-Type` is not `application/json` | 415 |

Numbers in JSON are strict: `true` or `"5"` is not a number.

## Measurements

- `POST /measurements`: `{value, timestamp?}`; no `timestamp` = server time. Rejected values
  (out of range, future) are logged at WARNING with sensor, series and value (F4: "the rejection
  appears in the error log") and not stored. Accepted ones update `sensors.last_measurement_at`.
- `GET /measurements?series=1,3&from&to&sort=timestamp|-timestamp&limit=1..10000 (1000)`:
  closed interval `from ≤ timestamp ≤ to`; no `series` = all series.
- Measurements have no PUT/PATCH/DELETE (405).

## Security headers (API)

Every API response: `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src
'none'; frame-ancestors 'none'`, `Referrer-Policy: no-referrer`. CORS: only `cors_origins`,
never `*` with credentials. The page's CSP comes from nginx (web side).

## Server layout (features, AGENTS.md section 5)

`pomiary_server/`: `problems.py` (error handlers, the Accept/Content-Type/security-header
middleware — plumbing), `auth/`, `series/`, `sensors/`, `measurements/` (each `model.py`,
`store.py`, `api.py`). Import layers, top to bottom: `app` → `measurements` → `sensors` →
`series` → `auth` → `problems` → `db` → `settings`.

## Checking it

The gate runs the teacher's `zai-tests.mjs` against a local server
(`scripts/.internal/contract-tests.sh`). Tests that cannot pass locally (HTTPS, the
http→https redirect) or not yet are listed there with a reason; the step fails when a listed
test starts passing (so the list only shrinks) and when any other test fails.

# Design — the web app

One page (SPA, React 19 + Mantine + Vite), no router: a header and tabs. Everything a
requirement needs is in one of these features (`pomiary_web/src/<feature>/`), independent of
each other (the eslint boundaries), composed only in `App.tsx`.

| Feature | What | Requirements |
| --- | --- | --- |
| `shell/` | header (title, "Log in" / user + "Log out"), the tabs, the layout grid, the loading and error components every feature uses, the footer with the Open-Meteo attribution | F9, F10, T2, T6 |
| `session/` | the login form, logout, the password change form; the token kept in `sessionStorage` (read defensively), passed down as a prop | F8, T5.3 |
| `dashboard/` | public: the filters (time range with presets, series checkboxes grouped by unit), one chart per unit, the table, row → point highlight, print | F2, F5, F6, F7, F10, T6, T7 |
| `series/` | admin: list, create, edit (name, range, colour, icon, unit), delete with confirmation; client-side validation before sending | F2, F3, F4, F9 |
| `sensors/` | admin: list (name, series, created, last measurement), register (name + series) with the key shown once in a dialog with a copy button, unregister with confirmation | F12, F9 |

Tabs: **Data** (everyone); **Series**, **Sensors**, **Account** only when logged in. Logged
out, the header has "Log in", which opens the login form in a modal.

## Shared plumbing (`api/`)

- `request<T>(path, {method, body, token, signal})` — JSON in and out; `token` adds
  `Authorization: Bearer`.
- A failed response becomes an `ApiError` with `status`, `detail` and `fieldErrors`
  (`{[field]: message}` from the Problem `errors`). Forms put `fieldErrors` under their
  fields; anything else is shown in an alert. A network failure is an `ApiError` with
  status 0 and a message saying the server cannot be reached (F9).
- A 401 on an admin call means the session is over: the app drops the token and says so.

## The dashboard

- **One chart per unit** among the visible series (mm, °C, %…): no second y-axis, every axis
  labelled with its unit. Recharts (SVG — prints sharply), time on the x-axis.
- **A series is never told apart by colour alone (T6):** its marker shape comes from
  `series.icon` (`circle`, `square`, `triangle`, `diamond`; anything else → circle), and the
  legend and the table header show the same marker (20 px) next to the name. A series is named
  `<place>: <quantity>` at the source (the generator's `seed`) and shown as `<name> (<unit>)`,
  the unit left out when empty; the UI never splits names.
- **The table:** one row per timestamp, one column per visible series (F2), newest first,
  empty cells where a series has no value. Columns (and legends, chart lines) run newest series
  first (highest `id`); every series column is at least 5 rem wide, as many as fit share the box
  and the rest scroll inside it with the time column sticky (about 13 at 1280 px, 3 on a phone). A row is a button-like element (keyboard: Tab +
  Enter/Space) — selecting it highlights that timestamp's points on the charts (a larger
  outlined marker and a vertical reference line) and marks the row (`aria-selected`) (F6).
- **Filters (F5):** from/to (`datetime-local` inputs) with presets (15 min, 3 h, 24 h, 7 days, 30 days - shortest first, for a 1 s live signal),
  series checkboxes grouped by unit with an "all of this unit" toggle. Default: the last 7
  days, every series. The page is one column, top to bottom: the filters (expanded by default,
  time range and presets in one row, series grouped by unit in a wrapping row below, stacked on
  a phone), then the charts, then the table, each full width. A "Hide filters" / "Show filters"
  button (`aria-expanded`) collapses them; the choice is not stored. A one-line summary
  ("Last 7 days · 12 of 12 series") sits next to the button and prints.
- **Short ranges and a lot of data:** the dashboard asks for `sort=-timestamp&limit=10000`, so
  when a range holds more, the newest 10,000 arrive and a `role="status"` notice says so (narrow
  the range to see all). The table renders at most `MAX_ROWS` = 500 rows (the newest) under the
  line "Showing the newest 500 of 10,800 rows"; the charts keep every point. A live preset
  slides: each point from the stream drops what is older than the preset's length before it
  (a hand-typed live range keeps its start). The x-axis ticks follow the span of the data:
  h:mm:ss up to 30 min, h:mm up to 6 h, date and h:mm beyond - all locale-aware.
- **Print (F7, T7):** the same view; `@media print` hides everything with the class
  `no-print` (header, tabs, filters, buttons, forms) and lets the table run over pages; the
  row-cap line prints with it.

## Layout and accessibility

- `src/app.css` holds the page grid: CSS Grid with media queries (T2 requires Flexbox/Grid
  **and** media queries in CSS) — the dashboard content always has the full width (the filters
  float over it); the table is `table-layout: fixed` with wrapping headers and a 5 rem minimum per
  series column: as many as fit show, the rest scroll in the box (the time column stays); on a phone (360 px) it scrolls inside its own box, the page
  never does.
- Landmarks (`header`, `nav`, `main`, `footer`), one `h1`, every input labelled, visible focus,
  WCAG AA contrast in both colour schemes, `lang="en"`. Lighthouse Accessibility ≥ 90 (A5).
- Forms submit with Enter (a real `<form>`), validate before sending, disable the button and
  show a loader while sending (F9).

## nginx (the page's headers, A4)

`Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'
'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` (Mantine sets
inline `style` attributes), plus `X-Content-Type-Options: nosniff`, `Referrer-Policy:
no-referrer`, on every response of the web container.
