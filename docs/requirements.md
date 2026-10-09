# Requirements matrix — ZAI 26Z "Measurement series"

Every requirement of the specification (`docs/spec/zai-projekt-26z.pdf`) has one row here. The gate
(`just check`, step "requirements", script `scripts/.internal/requirements.sh`) enforces that:

- no requirement code has disappeared from the tables;
- the status is one of: `todo`, `in progress`, `done`;
- a `done` row names, in the "Proof" column, an existing `docs/progress/*.md` file, and that
  file mentions the requirement code (it describes how the requirement was met and how to verify it).

The "Checked automatically" column says what in the gate or in the teacher's tests confirms the
requirement; "manually" means the proof is the recording or the checklist.

## Functional requirements

| Code | Requirement | Status | Proof | Checked automatically |
| --- | --- | --- | --- | --- |
| F1 | A result = a number + a timestamp + a series; only from sensors through the API | done | docs/progress/F4-sensors-and-measurements.md | pytest `tests/measurements/`; teacher's tests via `contract-tests.sh` |
| F2 | Series: name, min/max, color/icon; a column in the table, a curve on the chart | done | docs/progress/F9-series-admin.md | server: pytest `tests/series/`; admin form and table: e2e `series/series.e2e.ts`; a column and a curve per series with colour + marker: e2e `dashboard/dashboard.e2e.ts`, vitest `dashboard/table.test.ts`, `markers.test.ts` (docs/progress/F8-dashboard.md) |
| F3 | Roles: reader and administrator; nobody edits results in the UI | done | docs/progress/F9-series-admin.md | server: every modifying route needs the admin token (pytest `tests/series/`, `tests/sensors/`); the Series and Sensors tabs exist only when logged in (e2e `series.e2e.ts`, `sensors.e2e.ts`); no UI or API route edits a measurement (405, teacher's tests) |
| F4 | Range validation on the server, in the generator and in the forms; a log of rejections | done | docs/progress/F9-series-admin.md | server: pytest `tests/measurements/` (422 + WARNING log), `tests/series/` (min < max, 409); generator: pytest (readable 422 message); series form: vitest `series/validation.test.ts`, e2e `series/series.e2e.ts` (min < max before sending, 409/422 under the range) |
| F5 | Filtering: time range and visible series | done | docs/progress/F8-dashboard.md | vitest `dashboard/range.test.ts`, `grouping.test.ts`; e2e `dashboard/dashboard.e2e.ts` (presets, reversed range, unchecking a series) |
| F6 | Clicking a table row highlights the point on the chart | done | docs/progress/F8-dashboard.md | e2e `dashboard/dashboard.e2e.ts` (click and keyboard select a row, the marker and the line appear) |
| F7 | Printing the chart with the table, without controls | done | docs/progress/F8-dashboard.md | e2e `dashboard/dashboard.e2e.ts` (print media hides the controls, keeps charts and table) |
| F8 | Administrator account: log in, log out, change password | done | docs/progress/F6-web-foundation.md | pytest `tests/auth/` (API); browser: `src/session/session.e2e.ts` (log in, log out, password change, expired token) |
| F9 | UX: Enter key, validation before sending, loading states, server errors | done | docs/progress/F10-sensors-admin.md | every form is a real `<form>` validated before sending with a loading button: session (vitest `session/validation.test.ts`, e2e `session.e2e.ts`), series (`series/validation.test.ts`, `series.e2e.ts`), sensors (`sensors/validation.test.ts`, `sensors.e2e.ts`); loading/errors with Retry from `shell/`; network failure → `ApiError` status 0 (`api/client.test.ts`) |
| F10 | Responsive from 360 px | done | docs/progress/F11-accessibility.md | e2e at 360 px, no sideways scroll: `shell/Shell.e2e.ts` (frame), `dashboard/dashboard.e2e.ts` (Data), `sensors/sensors.e2e.ts` and `shell/accessibility.e2e.ts` (Series, Sensors); axe also runs on the Data tab at 360 px |
| F11 | Sample data: at least 3 series with at least 15 points each, loaded by the generator | in progress | docs/progress/F5-teachers-tests-in-the-gate.md | the gate seeds a fresh database with `seed` and the teacher's F11 test passes on it; the deployed app is seeded at deployment |
| F12 | Sensors: registration, one-time key, list, unregistration | done | docs/progress/F10-sensors-admin.md | server: pytest `tests/sensors/`; UI: e2e `sensors/sensors.e2e.ts` |
| F13 | Generator: address, key, count/interval, generation mode, past and current data | in progress | docs/progress/F2-data-generator.md | pytest pomiary_generator in the gate |

## Technical requirements

| Code | Requirement | Status | Proof | Checked automatically |
| --- | --- | --- | --- | --- |
| T1 | Backend: Python (FastAPI) | done | docs/progress/F0-initialization.md | pytest in the gate |
| T2 | Frontend SPA (React), Flexbox/Grid + media queries | in progress | docs/progress/F6-web-foundation.md | tsc, eslint, vitest in the gate; Grid and `@media` rules in `src/app.css` |
| T3 | REST API conforming to `zai-api-26z.yaml`, contract unchanged | in progress | docs/progress/F4-sensors-and-measurements.md | checksums of `docs/spec/SHA256SUMS` in the gate; pytest for every endpoint; teacher's tests via `contract-tests.sh` |
| T4 | Relational database, keys, constraints, time indexes, SQL migrations | in progress | docs/progress/F1-schema-and-auth.md | pytest against a real PostgreSQL (migration applied by every test run) |
| T5 | Security: bcrypt/Argon2id, parameterized queries, session/token, server-side authorization, sensor keys stored as SHA-256 | in progress | docs/progress/F4-sensors-and-measurements.md | UI (key shown once): e2e `sensors/sensors.e2e.ts`; pytest `tests/auth/`, `tests/series/`, `tests/sensors/`, `tests/measurements/`; B3 write-up: todo |
| T6 | Accessibility WCAG 2.2 AA; a series is not distinguished by color alone | done | docs/progress/F11-accessibility.md | axe (WCAG 2.0 to 2.2 A and AA) with zero violations on every screen and dialog in both colour schemes (`shell/accessibility.e2e.ts`); marker shapes, legend and table headers tell series apart; landmarks (`shell/Shell.e2e.ts`); keyboard and focus: Enter in forms, focus into and back from dialogs, `:focus-visible` outline |
| T7 | Printing through `@media print` of the same view | done | docs/progress/F8-dashboard.md | e2e `shell/Shell.e2e.ts` (header, tabs, footer) and `dashboard/dashboard.e2e.ts` (controls hidden, charts and table kept) |
| T8 | The teacher's tests (`zai-tests.mjs`) pass | in progress | docs/progress/F5-teachers-tests-in-the-gate.md | gate step "teacher's tests": all pass on localhost except the 3 HTTPS/page cases; on the deployed app after T10 |
| T9 | Repository with a readable history throughout the project | in progress | docs/progress/F0-initialization.md | gitleaks in the gate |
| T10 | Public deployment (HTTPS) | todo | | |
| T11 | Generator in the repo, through the API, key not in the code, documented | done | docs/progress/F2-data-generator.md | pytest pomiary_generator in the gate; key only from `--api-key` / `POMIARY_API_KEY` |

## Automatic scoring (the teacher's tests)

| Code | What the tests check | Status | Proof | Checked automatically |
| --- | --- | --- | --- | --- |
| A1 | E1: contract conformance, sensors, filtering, F11 | in progress | docs/progress/F5-teachers-tests-in-the-gate.md | gate step "teacher's tests": 23/23 contract tests pass locally (6/6 points) |
| A2 | E2: contract conformance again | in progress | docs/progress/F5-teachers-tests-in-the-gate.md | the same gate step, on every change |
| A3 | Validation and authorization (422, 400/422, 401, no editing of results) | in progress | docs/progress/F4-sensors-and-measurements.md | gate step "teacher's tests": 14/14 pass locally; graded after deployment |
| A4 | HTTPS, headers with CSP, cookie flags, no secrets in responses | in progress | docs/progress/F6-web-foundation.md | curl of the container (see the progress file): CSP, nosniff, Referrer-Policy; HTTPS and cookie flags after deployment |
| A5 | Lighthouse Accessibility ≥ 90 | in progress | docs/progress/F11-accessibility.md | `just lighthouse`: 100 light / 100 dark on the local stack; the graded run is against the deployed app, so this stays in progress until deployed |

## Recording, checklist, archive

| Code | What must be visible | Status | Proof | Checked automatically |
| --- | --- | --- | --- | --- |
| B1 | F1–F13 in the recording | todo | | |
| B2 | Mobile view at ~360 px and the print preview | todo | | |
| B3 | Two T5 items in the recording and in the documentation | todo | | |
| B4 | ERD diagram and migrations in the archive | todo | | |
| B5 | Complete PDF documentation | todo | | |

## Extensions (bonus points)

| Code | Extension | Status | Proof | Checked automatically |
| --- | --- | --- | --- | --- |
| X1 | Live chart (SSE / WebSocket) | done | docs/progress/F8-dashboard.md | server: pytest `tests/measurements/test_stream.py` (docs/progress/F7-live-stream-server.md); client: vitest `dashboard/live.test.ts`; together: e2e `dashboard.e2e.ts` "…appears without reloading (live stream)"; shown in the video (E2) |
| X2 | Generator with real data (Open-Meteo) | in progress | docs/progress/F2-data-generator.md | recorded-response test in the gate; `pytest -m live` against the real service |
| X3 | Own tests in CI with a green status | in progress | docs/progress/F0-initialization.md | `.github/workflows/ci.yml` runs the gate |
| X4 | Time-series database (TimescaleDB) | todo | | |
