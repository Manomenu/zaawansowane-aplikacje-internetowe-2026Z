# F41 — deployed, seeded and verified with the teacher's tests

Date: 2026-10-12. The cluster became reachable again; the app was deployed and checked against everything the
teacher's script grades.

## What was met

| Code | Scope |
| --- | --- |
| T10 | **Met.** https://pomiary-lasy.gugnowski.com, deployed by Argo CD from suwalski-platform (`argocd/apps/projects/pomiary.yaml`, image `sha-069dbf8`); the post-sync smoke test passed. |
| F11 | **Met on production.** `seed` sent 1 440 values through the API (12 series × 120, 30 days, every 6 h), 0 problems. |
| T8 | **Met.** The teacher's script against the public address passes every test. |
| A1 | **Met.** Stage E1: 10/10. |
| A2 | **Met.** Stage E2, contract: 6/6. |
| A3 | **Met.** Validation: 4/4. |
| A4 | **Met.** Security: 3/3; the three tests that cannot pass on localhost (HTTPS, HTTP→HTTPS, page CSP) pass here. |
| A5 | **Met.** Lighthouse Accessibility 100 (3/3), run by the teacher's script with `--lighthouse`. |
| B5 | **Met.** The documentation has no TODO; the PDF carries the deployment and the admin login. |

## What was done

- Platform repo (`suwalski-platform`, commit `821b015`): the parked Argo Application, the database and role in the
  shared CloudNativePG cluster, the Gatus check and the homepage tile; `scripts/projects/pomiary/setup.sh`
  created the `admin` and `database` Secrets.
- Seeding found a blocker first: Cloudflare refused the generator's default user agent (F38); after the fix and
  the lighter seed (F39) it ran in about 5 minutes.
- The teacher's script with stage E2 and `--lighthouse` (Chromium from Playwright through `CHROME_PATH`; without
  it the script reports a Lighthouse error and 0 points), then with stage E1. Both left the 12 sample series as
  they were: the tests delete only what they create.

## Why this way

- **The real script, at the real address:** the score is computed by exactly what the teacher runs, so it
  replaces our own approximations (the local gate keeps the 3 localhost-only tests as known failures).
- **`CHROME_PATH`:** the teacher's script runs `npx lighthouse`, which needs a Chrome; this machine has only
  Playwright's Chromium. The teacher runs it on their own machine.

## How to verify

```sh
set -a; . ~/repos/suwalski-platform/.secrets/pomiary.env; set +a
export CHROME_PATH="$(find ~/.cache/ms-playwright -path '*/chromium-*/chrome-linux*/chrome' -type f | sort -V | tail -n 1)"
node docs/spec/zai-tests.mjs --app https://pomiary-lasy.gugnowski.com --user "$ADMIN_USERNAME" --pass "$ADMIN_PASSWORD" --stage E2 --lighthouse
# === Etap E2: 16 pkt; stage E1: 10 pkt
```
