# F14 — requirements review before deployment

Date: 2026-10-10. Project stage: before E1. Everything a local machine can prove is built. What
is left needs the cluster (deployment), the recording or the submission package.

## What was met

This step changes no code. It goes through every row still `in progress` and closes the ones
whose requirement is fully met by what is already in the repository and verified:

| Code | Why it is done now |
| --- | --- |
| T2 | The SPA is React 19 + Mantine. The layout uses CSS Grid (`pomiary_web/src/app.css`: the page grid) and Flexbox (`dashboard/dashboard.css`), with media queries in both (768 px, 992 px, the phone rules, print). Responsiveness is checked by e2e at 360 / 1024 / 1280 px (docs/progress/F13-dashboard-layout.md, docs/progress/F11-accessibility.md). |
| T3 | Every operation of `zai-api-26z.yaml` exists, and the contract file is pinned by `docs/spec/SHA256SUMS`. The teacher's contract tests pass 23/23 on every gate run (docs/progress/F5-teachers-tests-in-the-gate.md). Our one addition is a new path, `GET /measurements/stream` (docs/progress/F7-live-stream-server.md). Grading on the deployed app is A1/A2. |
| T4 | PostgreSQL 17. `migrations/001_schema.sql` creates typed columns, primary and foreign keys with explicit `ON DELETE`, `CHECK` constraints, `UNIQUE` on hashes and usernames, and the `(series_id, measured_at)` time index. Migrations are applied and checksummed at start-up (`db.py`). ERD: `docs/erd.md`. |
| T5 | All five items are on the server: (1) Argon2id; (2) only parameterised SQL; (3) opaque tokens stored as SHA-256 with expiry, revoked at logout; (4) every modifying route checks the admin token or the sensor key on the server before the body; (5) keys are 43 random characters, stored only as SHA-256 and shown once (UI: docs/progress/F10-sensors-admin.md). Proven by pytest `tests/auth`, `tests/series`, `tests/sensors`, `tests/measurements` and by the teacher's A3 tests. Showing two of them in the recording is B3. |
| F13 | The generator's every parameter and both modes (backfill with past timestamps, live at an interval) are tested (60 tests). It was run against a real server: 576 synthetic values, a readable 422 rejection, a 401 on an unregistered key (docs/progress/F4-sensors-and-measurements.md). |
| X2 | The generator reads Open-Meteo for real. On 2026-10-09, `seed --source open-meteo` sent 864 hourly values (3 places × 4 quantities × 3 days) to the compose stack with 0 problems, a live `send --source open-meteo` sent current values, and there is a live test (`pytest -m live`). Showing it in the recording is part of the submission. |

Still open, and why:
- **T9:** the history grows until the end.
- **T8, T10, A1–A5, F11 on the deployed app:** they need the cluster. Today it cannot be reached from the owner's network (suwalski-platform `TODO.md`, "Sieć domowa i Tailscale").
- **B1–B5:** the recording, the PDF and the ZIP.
- **X4:** not planned. The shared PostgreSQL in the cluster runs the PostGIS image for grzyby, so TimescaleDB would need a separate image or database cluster.

## What was done

- Updated `docs/requirements.md`: T2, T3, T4, T5, F13 and X2 are `done`, with this file as the proof.
- Checked the evidence again before changing a row:
  - the media queries and grids in `app.css` and `dashboard.css`;
  - the one migration file;
  - the test counts per feature;
  - the gate's teacher's-tests step (green in the last run, together with CI run `b6cf560`).

## Why this way

- **One review step instead of flipping statuses inside feature steps:** several requirements are only met by several steps together (T5 across auth, sensors and the UI; T2 across the shell, the dashboard and the accessibility work). Closing them in one place, with the reasons side by side, makes the matrix easy to check against the code. Weak spots in the verification (spot checks cost 5 points) show up here first.
- **X4 left out on purpose:** +3 points do not outweigh changing the shared database every other project on the cluster uses (AGENTS.md section 0: when in doubt, leave it out).

## How to verify

```sh
./scripts/.internal/requirements.sh     # the matrix: every "done" names an existing progress file that mentions its code
just check                              # the gate, including the teacher's tests on a local server
grep -n "@media\|display: grid" pomiary_web/src/app.css pomiary_web/src/dashboard/dashboard.css
```
