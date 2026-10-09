# F1 — schema, error handling, administrator authentication

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07). Implements the "Database",
"Authentication" and "Errors" parts of `docs/design.md`.

## What was met

| Code | Scope |
| --- | --- |
| T4 | **Partly, the schema is complete.** `migrations/001_schema.sql` creates `admins`, `sessions`, `series`, `sensors`, `measurements` with typed columns (`bigint` identity keys, `double precision` values, `timestamptz` times), primary and foreign keys with `ON DELETE` rules (CASCADE, and SET NULL for `measurements.sensor_id`), `UNIQUE` (username, API key hash), `CHECK` constraints (name length, `min_value < max_value`, colour pattern, unit length) and indexes: `(series_id, measured_at)` for the time queries, `sensors(series_id)`, `sessions(expires_at)`. Still to do: the ERD for the archive (B4), the time-range query tests that arrive with the measurements. |
| T5 | **Items 1–3 of 5.** (1) Passwords are Argon2id hashes (`argon2-cffi`). (2) Every query is parametrized (psycopg `%s`), none is built from strings. (3) The session token is opaque, random, stored only as SHA-256 and expires after `token_ttl_seconds`. Still to do: server-side authorization of the series and sensor routes (they will use `current_admin`), sensor keys stored as SHA-256. |
| F8 | **The API side.** `POST /auth/login`, `POST /auth/logout`, `PUT /auth/password`. The login/logout/password screens come with the web steps. |
| T3 | **Partly.** The three auth endpoints follow `docs/spec/zai-api-26z.yaml`; every error is `application/problem+json`, with 400/401/403/404/405/406/415 handled for the whole API (the 422/409 mechanism is ready for the features). Series, sensors and measurements are still missing. |

## What was done

- **Migration** `001_schema.sql`; `migrations/.gitkeep` removed.
- **`problems.py`** (plumbing): handlers that turn `HTTPException` (so 404 and 405 too), request
  validation failures, `Unprocessable` (422), `Conflict` (409) and any unexpected exception into
  Problem Details. Invalid JSON is 400, a schema or query failure is 400 with
  `errors: [{field, message}]`, an unexpected exception is logged and answered with a bare 500.
  A middleware answers 406 (an `Accept` that allows neither JSON type; wildcards count, no header
  is fine) and 415 (a POST/PUT with a body whose `Content-Type` is not `application/json`) and adds
  `X-Content-Type-Options`, `Content-Security-Policy` and `Referrer-Policy` to every response.
  The one exception is Swagger UI (`/docs`, `/redoc`). It is an HTML page loading its script from
  a CDN, so it skips the Accept check and the CSP, and keeps the other headers. It carries no
  data.
  CORS in `app.py` is unchanged (listed origins only, no credentials, no `*`) and stays outermost.
- **Settings:** `public_api_prefix`, `token_ttl_seconds`, `admin_username`, `admin_password`, each
  with a commented line in `pomiary_server/.env.example`. `compose.yaml` sets a local-only
  administrator; the Helm chart gets `server.adminSecret`, the name of a Secret with
  `ADMIN_USERNAME` and `ADMIN_PASSWORD`, read through `envFrom` like `databaseSecret`.
- **`auth/`** (`model.py`, `store.py`, `api.py`): the three routes, the dependency `current_admin`
  (Bearer token, SHA-256, unexpired session, else 401 with `WWW-Authenticate: Bearer`) for other
  features' admin routes, and `store.bootstrap_admin`, which the app's lifespan calls after the
  migrations when both settings are set.
- **Import contracts:** `app → auth → problems → db → settings` in the root `pyproject.toml`, plus
  `api → store → model` inside `auth`.
- **Tests:** `tests/auth/` (login, logout, password change, expired and forged tokens, bootstrap,
  hashing and storage) and `tests/test_problems.py` (every row of the error table that exists
  now, security headers, no traceback in a 500), all against the real PostgreSQL where they touch it.
- `openapi.d.ts` regenerated (`just api-types`).

Left for later steps: series, sensors (API keys, `X-API-Key`) and measurements with their
validation and 422/409 rules; the web screens; the ERD; the teacher's tests in the gate.

## Why this way

- **Opaque tokens, not JWT.** Logout must revoke at once (the contract tests it). A stateless JWT
  cannot do that without a blocklist, and a blocklist is a session table anyway. Only the SHA-256
  of the token is stored, so a copy of the database does not log anyone in.
- **Argon2id** over bcrypt: the current OWASP recommendation, no 72-byte limit, and
  `argon2-cffi`'s defaults follow RFC 9106. An unknown username is verified against a dummy hash,
  so the response time does not reveal which usernames exist; both cases give the same 401.
- **Password change keeps the current session and ends the others**: a stolen session does not
  survive the change, and the person changing the password is not logged out.
- **Writes commit inside the store functions.** A FastAPI dependency that yields the connection
  releases it (and commits) only after the response has been sent, so a client could use a token
  the server has not yet committed. The store commits before the route returns.
- **Authentication before validation:** `current_admin` is a dependency, which FastAPI runs before
  it validates the body, so an admin route without a token is 401 whatever the body is (tested).
  (Syntactically broken JSON is read first and gives 400.)
- **406/415 in a middleware**, not per route: the rule is the same for the whole API and the teacher
  checks it on routes that do not exist yet. The unhandled-exception handler runs outside the
  middleware, so it adds the security headers itself.
- **The first admin from the environment, only when the table is empty.** No default password in
  code or in the repository; a single `INSERT ... WHERE NOT EXISTS ... ON CONFLICT DO NOTHING`
  is safe when two replicas start together. Left out: a CLI to add admins (one admin is enough).
- **`adminSecret` as a separate chart value**, so the platform repo creates it independently of the
  database Secret. The values themselves are never in this repository.
- Left out: rate limiting of the login (the Cloudflare rule is the plan, AGENTS.md section 8),
  password rehashing on parameter changes, refresh tokens.

## How to verify

```sh
just db up
cd pomiary_server && uv run pytest tests/auth tests/test_problems.py -v
just check                                  # the whole gate

# by hand (routes are served without /api; the edge adds it)
ADMIN_USERNAME=admin ADMIN_PASSWORD=<your password> just server
curl -i -X POST localhost:6220/auth/login -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"<your password>"}'            # 200 + accessToken
curl -i localhost:6220/series -H 'Accept: application/xml'             # 406 problem+json
curl -i -X POST localhost:6220/auth/login -H 'Content-Type: text/plain' -d x   # 415
curl -i -X POST localhost:6220/auth/logout -H "Authorization: Bearer <token>"  # 204, then 401
```
