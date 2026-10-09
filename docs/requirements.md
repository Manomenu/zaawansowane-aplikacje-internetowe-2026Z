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
| F1 | A result = a number + a timestamp + a series; only from sensors through the API | todo | | |
| F2 | Series: name, min/max, color/icon; a column in the table, a curve on the chart | todo | | |
| F3 | Roles: reader and administrator; nobody edits results in the UI | todo | | |
| F4 | Range validation on the server, in the generator and in the forms; a log of rejections | in progress | docs/progress/F2-data-generator.md | generator: pytest (readable 422 message) |
| F5 | Filtering: time range and visible series | todo | | |
| F6 | Clicking a table row highlights the point on the chart | todo | | |
| F7 | Printing the chart with the table, without controls | todo | | |
| F8 | Administrator account: log in, log out, change password | in progress | docs/progress/F1-schema-and-auth.md | pytest: `tests/auth/` (the API side; the UI is still to do) |
| F9 | UX: Enter key, validation before sending, loading states, server errors | todo | | |
| F10 | Responsive from 360 px | todo | | |
| F11 | Sample data: at least 3 series with at least 15 points each, loaded by the generator | in progress | docs/progress/F2-data-generator.md | generator `seed`: pytest against a fake API |
| F12 | Sensors: registration, one-time key, list, unregistration | todo | | |
| F13 | Generator: address, key, count/interval, generation mode, past and current data | in progress | docs/progress/F2-data-generator.md | pytest pomiary_generator in the gate |

## Technical requirements

| Code | Requirement | Status | Proof | Checked automatically |
| --- | --- | --- | --- | --- |
| T1 | Backend: Python (FastAPI) | done | docs/progress/F0-initialization.md | pytest in the gate |
| T2 | Frontend SPA (React), Flexbox/Grid + media queries | in progress | docs/progress/F0-initialization.md | tsc, eslint, vitest in the gate |
| T3 | REST API conforming to `zai-api-26z.yaml`, contract unchanged | in progress | docs/progress/F1-schema-and-auth.md | checksums of `docs/spec/SHA256SUMS` in the gate; pytest: `tests/auth/`, `tests/test_problems.py` |
| T4 | Relational database, keys, constraints, time indexes, SQL migrations | in progress | docs/progress/F1-schema-and-auth.md | pytest against a real PostgreSQL (migration applied by every test run) |
| T5 | Security: bcrypt/Argon2id, parameterized queries, session/token, server-side authorization, sensor keys stored as SHA-256 | in progress | docs/progress/F1-schema-and-auth.md | pytest: `tests/auth/` |
| T6 | Accessibility WCAG 2.2 AA; a series is not distinguished by color alone | todo | | |
| T7 | Printing through `@media print` of the same view | todo | | |
| T8 | The teacher's tests (`zai-tests.mjs`) pass | todo | | |
| T9 | Repository with a readable history throughout the project | in progress | docs/progress/F0-initialization.md | gitleaks in the gate |
| T10 | Public deployment (HTTPS) | todo | | |
| T11 | Generator in the repo, through the API, key not in the code, documented | done | docs/progress/F2-data-generator.md | pytest pomiary_generator in the gate; key only from `--api-key` / `POMIARY_API_KEY` |

## Automatic scoring (the teacher's tests)

| Code | What the tests check | Status | Proof | Checked automatically |
| --- | --- | --- | --- | --- |
| A1 | E1: contract conformance, sensors, filtering, F11 | todo | | |
| A2 | E2: contract conformance again | todo | | |
| A3 | Validation and authorization (422, 400/422, 401, no editing of results) | todo | | |
| A4 | HTTPS, headers with CSP, cookie flags, no secrets in responses | todo | | |
| A5 | Lighthouse Accessibility ≥ 90 | todo | | |

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
| X1 | Live chart (SSE / WebSocket) | todo | | |
| X2 | Generator with real data (Open-Meteo) | in progress | docs/progress/F2-data-generator.md | recorded-response test in the gate; `pytest -m live` against the real service |
| X3 | Own tests in CI with a green status | in progress | docs/progress/F0-initialization.md | `.github/workflows/ci.yml` runs the gate |
| X4 | Time-series database (TimescaleDB) | todo | | |
