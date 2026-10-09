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
