# F16 — Swagger UI working behind nginx

Date: 2026-10-10. A bugfix found while checking the documentation's claims before deployment.

## What was met

| Code | Scope |
| --- | --- |
| T3 | The API's documentation page, `/api/docs`, now works where the app really runs: behind nginx in the web image, and so behind the Cloudflare tunnel. It lists every endpoint, and "Try it out" calls `/api/...`. Nothing in the contract changed. |
| A4 | The strict page policy stays on every response. Only the one Swagger HTML page gets a CSP that allows jsDelivr and an inline script, and that page carries no data. |

## What was done

The documentation (B5) points the teacher to `/api/docs`. Checked against the compose stack
(the real web image), the page was broken in three ways:

1. **The schema did not load.** FastAPI's own page asked for `/openapi.json`. Behind nginx
   only `/api/...` reaches the server, so that request got the web app's `index.html`.
   - Fix: `docs_url=None`, and our own `/docs` route in `app.py` calls
     `get_swagger_ui_html(openapi_url="/api/openapi.json")`, built from
     `settings.public_api_prefix`.
   - Test: `test_the_swagger_page_asks_for_the_schema_under_the_public_prefix`.
2. **The page CSP blocked the script.** `default-src 'self'` from `security-headers.conf`
   stopped the script and styles from `cdn.jsdelivr.net` and Swagger's inline start-up
   script.
   - Fix: a `location = /api/docs` block in `nginx.conf.template` hides the server's headers
     and sets its own CSP, which adds only `https://cdn.jsdelivr.net`, `'unsafe-inline'` for
     scripts on this page, and the FastAPI favicon host.
3. **"Try it out" called paths without `/api`.**
   - Fix: `servers=[{"url": "/api"}]` in the OpenAPI schema.

Verified on the rebuilt compose stack:
- headless Chromium rendered `http://localhost:8092/api/docs` with every path of the API,
  `/measurements/stream` included;
- `/api/openapi.json` answers JSON with `servers: [{"url": "/api"}]`;
- `/` still carries the strict CSP.

A first attempt set `root_path="/api"` on the app. It was dropped because Starlette then also
routes `/api/health` on the bare server, so every route answered at two paths, and
`test_routes_carry_no_api_prefix` caught it.

## Why this way

- **An explicit `/docs` route instead of `root_path`:** it changes only the page, not the
  routing (see the first attempt above).
- **A per-location CSP instead of loosening the page's:** the teacher's A4 test checks the main
  page's CSP, and the dashboard needs no external script. Only the documentation page gets the
  exceptions it needs.
- **Not self-hosting Swagger's assets:** it would bring a dependency and files to keep up to
  date for a page used a few times (AGENTS.md section 0).

## How to verify

```sh
just up
curl -sI http://localhost:8092/api/docs | grep -i content-security-policy   # Swagger's policy
curl -sI http://localhost:8092/ | grep -i content-security-policy           # the strict one
# open http://localhost:8092/api/docs in a browser: every endpoint is listed, "Try it out" works
env -u VIRTUAL_ENV uv run --directory pomiary_server pytest -q tests/test_problems.py tests/test_app.py
```
