#!/usr/bin/env bash
# The teacher's test script (docs/spec/zai-tests.mjs) against a local server — the same tests
# that grade the project (A1–A4), run by the gate on every change instead of once after the
# deadline. Humans run `just contract-tests`; check.sh runs this script. The database is seeded
# by the generator first, as the deployed one will be (F11).
#
# A fresh database (pomiary_contract) and a server of its own on :6222 (e2e.sh uses :6221), so
# nothing you develop with is touched. The script only exits 0 when the outcome is exactly the
# expected one:
#   - every test not listed in KNOWN_FAILING passes;
#   - every listed test fails — when one starts passing, take it off the list. The list only
#     shrinks, and each entry says why it cannot pass here (yet).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PORT=6222
DB=pomiary_contract
URL="http://localhost:$PORT"
ADMIN_USER=contract-admin
ADMIN_PASSWORD=contract-tests-only-password
REPORT="$ROOT/.artifacts/contract-tests.txt"

# Test names exactly as zai-tests.mjs prints them (Polish: the teacher's file), with the reason.
declare -A KNOWN_FAILING=(
    # Local runs are plain HTTP on localhost; HTTPS comes from the Cloudflare tunnel (T10).
    ["Aplikacja i API działają przez HTTPS"]="no HTTPS on localhost"
    ["Wejście przez http:// przekierowuje na https:// (lub port 80 jest zamknięty)"]="no HTTPS on localhost"
    # The page and its CSP come from nginx in the web image; here --app is the bare API server.
    ["Strona główna wysyła nagłówek Content-Security-Policy"]="no web page on the API server"
)

if [ -z "${CI:-}" ]; then
    "$ROOT/scripts/.internal/db.sh" up >/dev/null
fi

(cd "$ROOT/pomiary_server" && unset VIRTUAL_ENV && uv run python - "$DB" <<'PY'
import sys

import psycopg
from psycopg import sql

with psycopg.connect("postgresql://pomiary:pomiary@localhost:5453/postgres", autocommit=True) as admin:
    admin.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(sql.Identifier(sys.argv[1])))
    admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(sys.argv[1])))
PY
)

# The edge (vite, nginx) strips /api before a request reaches the server; the teacher's tests
# call /api/..., so here a few lines of ASGI do the stripping instead.
mkdir -p "$ROOT/.artifacts"
(cd "$ROOT/pomiary_server" && unset VIRTUAL_ENV &&
    DATABASE_URL="postgresql://pomiary:pomiary@localhost:5453/$DB" \
    ADMIN_USERNAME="$ADMIN_USER" ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    exec uv run python - "$PORT" <<'PY'
import sys

import uvicorn

from pomiary_server.app import app


async def strip_api(scope, receive, send):
    if scope["type"] in ("http", "websocket") and scope["path"].startswith("/api/"):
        scope = {**scope, "path": scope["path"][4:], "raw_path": scope["raw_path"][4:]}
    await app(scope, receive, send)


uvicorn.run(strip_api, port=int(sys.argv[1]), log_level="warning")
PY
) >"$ROOT/.artifacts/contract-server.log" 2>&1 &
SERVER=$!
trap 'kill "$SERVER" 2>/dev/null || true; wait "$SERVER" 2>/dev/null || true' EXIT

for _ in $(seq 1 50); do
    curl -fs "$URL/api/health" >/dev/null 2>&1 && break
    sleep 0.2
done
curl -fs "$URL/api/health" >/dev/null || {
    echo "server did not start — .artifacts/contract-server.log:" >&2
    tail -20 "$ROOT/.artifacts/contract-server.log" >&2
    exit 1
}

# The sample data (F11) the way the real app gets it: the generator through the API. Synthetic,
# so the gate never depends on Open-Meteo; one day of hourly values is 24 per series (≥ 15).
(cd "$ROOT/pomiary_generator" && unset VIRTUAL_ENV &&
    uv run python -m pomiary_generator seed --api "$URL" --user "$ADMIN_USER" --password "$ADMIN_PASSWORD" \
        --days 1 --source synthetic) >"$ROOT/.artifacts/contract-seed.log" 2>&1 || {
    echo "seeding failed — .artifacts/contract-seed.log:" >&2
    tail -20 "$ROOT/.artifacts/contract-seed.log" >&2
    exit 1
}

node "$ROOT/docs/spec/zai-tests.mjs" --app "$URL" --user "$ADMIN_USER" --pass "$ADMIN_PASSWORD" --stage E2 | tee "$REPORT"

FAILED=0
declare -A SEEN=()
while IFS= read -r line; do
    if [[ "$line" =~ ^\ \ (✔|✘)\ (.*)$ ]]; then
        mark="${BASH_REMATCH[1]}"
        name="${BASH_REMATCH[2]}"
        SEEN["$name"]=1
        if [ "$mark" = "✘" ] && [ -z "${KNOWN_FAILING[$name]+x}" ]; then
            echo "FAIL (unexpected): $name" >&2
            FAILED=1
        elif [ "$mark" = "✔" ] && [ -n "${KNOWN_FAILING[$name]+x}" ]; then
            echo "PASSES NOW — remove it from KNOWN_FAILING in $0: $name" >&2
            FAILED=1
        fi
    fi
done <"$REPORT"

for name in "${!KNOWN_FAILING[@]}"; do
    [ -n "${SEEN[$name]+x}" ] || { echo "KNOWN_FAILING names a test that does not exist: $name" >&2; FAILED=1; }
done
[ ${#SEEN[@]} -gt 0 ] || { echo "no test results found in the output" >&2; FAILED=1; }

[ "$FAILED" -eq 0 ] && echo "teacher's tests: ${#SEEN[@]} run, ${#KNOWN_FAILING[@]} expected failures (localhost) — OK"
exit "$FAILED"
