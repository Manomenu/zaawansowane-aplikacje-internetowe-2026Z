#!/usr/bin/env bash
# End-to-end tests (pomiary_web/src/**/*.e2e.ts): a real browser against the real server and
# database. Humans run `just e2e`, CI runs this script. Arguments go to Playwright, e.g.
#   e2e.sh --headed        watch the browser
#   e2e.sh -g "health"     only the tests whose name matches
#
# E2E_DATABASE_NAME, E2E_SERVER_PORT and E2E_WEB_PORT (defaults pomiary_e2e, 6221, 3221) let
# several runs go at once, each with its own database and ports.
#
# Every run starts from an empty database of its own (pomiary_e2e), next to the development
# one, and its own server and web app (playwright.config.ts) — what you run by hand is not
# touched. Locally it starts PostgreSQL (just db); CI provides it as a service. A service the
# app gains later (a converter, a cache) gets started here the same way.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_NAME="${E2E_DATABASE_NAME:-pomiary_e2e}"
export E2E_DATABASE_URL="${E2E_DATABASE_URL:-postgresql://pomiary:pomiary@localhost:5453/$DB_NAME}"

if [ -z "${CI:-}" ]; then
    "$ROOT/scripts/.internal/db.sh" up >/dev/null
fi

# A fresh database for the run: the tests may then assume nothing but what they create.
(cd "$ROOT/pomiary_server" && unset VIRTUAL_ENV && uv run python - "$DB_NAME" <<'PY'
import sys

import psycopg
from psycopg import sql

with psycopg.connect("postgresql://pomiary:pomiary@localhost:5453/postgres", autocommit=True) as admin:
    name = sql.Identifier(sys.argv[1])
    admin.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(name))
    admin.execute(sql.SQL("CREATE DATABASE {}").format(name))
PY
)

cd "$ROOT/pomiary_web"
[ -d node_modules ] || pnpm install --frozen-lockfile --silent
exec pnpm exec playwright test -c e2e/playwright.config.ts "$@"
