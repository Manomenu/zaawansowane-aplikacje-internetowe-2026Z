#!/usr/bin/env bash
# Lighthouse accessibility score (A5) of a running app, in the light and the dark colour scheme.
# Not a gate step: it needs the built stack (`just up`) or the deployed app. Run it before a
# submission and after a deployment, against the public URL:
#   lighthouse.sh                         http://localhost:8092
#   lighthouse.sh https://example.com     the deployed app
# Uses Playwright's Chromium (installed by the e2e tests), headless. Prints both scores and every
# failed audit with its elements; the JSON reports go to .artifacts/lighthouse/. Exits non-zero
# when a score is below THRESHOLD (A5 gives full points from 90).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
URL="${1:-http://localhost:8092}"
THRESHOLD=90
OUT="$ROOT/.artifacts/lighthouse"
mkdir -p "$OUT"

CHROME_PATH="$(find "$HOME/.cache/ms-playwright" -path '*/chromium-*/chrome-linux*/chrome' -type f 2>/dev/null | sort -V | tail -n 1)"
if [ -z "$CHROME_PATH" ]; then
    echo "No Playwright Chromium found: run 'cd pomiary_web && pnpm exec playwright install chromium'." >&2
    exit 1
fi
export CHROME_PATH

failed=0
# blink's preferredColorScheme: 0 = dark, 1 = light (checked with matchMedia in headless Chromium).
for scheme in light dark; do
    if [ "$scheme" = light ]; then blink=1; else blink=0; fi
    report="$OUT/$scheme.json"
    npx --yes lighthouse "$URL" --only-categories=accessibility --output=json --output-path="$report" \
        --chrome-flags="--headless=new --no-sandbox" --quiet \
        --form-factor=desktop --screenEmulation.disabled \
        --throttling-method=provided \
        --blink-settings="preferredColorScheme=$blink" >/dev/null
    python3 - "$report" "$scheme" "$THRESHOLD" <<'PY' || failed=1
import json
import sys

path, scheme, threshold = sys.argv[1], sys.argv[2], int(sys.argv[3])
data = json.load(open(path))
score = round(data["categories"]["accessibility"]["score"] * 100)
print(f"Lighthouse accessibility, {scheme}: {score}")
for audit in data["audits"].values():
    if audit.get("scoreDisplayMode") == "binary" and audit.get("score") == 0:
        print(f"  FAILED {audit['id']}: {audit['title']}")
        for item in audit.get("details", {}).get("items", []):
            node = item.get("node", {})
            print(f"    {node.get('selector', '?')}: {node.get('explanation', '').splitlines()[0] if node.get('explanation') else ''}")
sys.exit(0 if score >= threshold else 1)
PY
done
exit "$failed"
