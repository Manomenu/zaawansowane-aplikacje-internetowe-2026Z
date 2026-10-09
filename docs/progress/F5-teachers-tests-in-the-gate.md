# F5 — the teacher's tests in the gate

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07).

## What was met

| Code | Scope |
| --- | --- |
| T8 | **In progress.** The teacher's script runs on every change, as a step of `just check` and of CI. On localhost every test passes except three that need the deployed app (T10). |
| A1 | **Locally: 23 of 23 contract tests pass (6 of 6 points in the E2 scoring).** That includes the sample-data test, now that the gate seeds the database. |
| A2 | **The same step guards it on every change after E1.** |
| F11 | **Proven on a fresh database:** the generator's `seed` creates 12 series with 24 hourly points each through the API, and the teacher's F11 test passes. The deployed app is seeded at deployment, with Open-Meteo data. |

Locally, A4 is 5 of 8 points. The three failing tests are the expected ones: no HTTPS, no http→https redirect, and no page with a CSP on the bare API server. They can only pass on the deployed app.

## What was done

- `scripts/.internal/contract-tests.sh` (`just contract-tests`):
  - creates a fresh `pomiary_contract` database and starts the server on :6222 with a test admin. The port is apart from `e2e.sh`'s :6221;
  - strips the `/api` prefix the way nginx does, with a few lines of ASGI;
  - seeds the database with the generator (`seed --days 1 --source synthetic`);
  - runs `node docs/spec/zai-tests.mjs --stage E2` and saves the report to `.artifacts/contract-tests.txt`.
- **The ratchet:** the step passes only when the result is exactly as expected. Every test outside `KNOWN_FAILING` passes, and every test in it fails. A listed test that starts passing fails the step too, so the list can only shrink. Each entry gives its reason, and a name that matches no test is an error.
- `scripts/.internal/check.sh` runs it after the Python tests: step "teacher's tests (zai-tests.mjs on a local server)". CI already has PostgreSQL and Node 24 in the `test` job, so nothing changed there.
- `AGENTS.md`: a row for the step in the gate table, and one for the script in the agents' table (section 10).

## Why this way

- **The teacher's file as is.** It is checksummed, so this step runs exactly what grades the project. Rewritten tests would always lag behind it.
- **Seeding with the generator, not SQL:** F11 requires the sample data to arrive through the API, and the step checks the whole route (login, series, sensors, measurements) on every change. It uses synthetic data, so the gate never depends on Open-Meteo.
- **A ratchet instead of a score threshold:** a threshold ("≥ 90 %") would let a new failure hide behind a fixed old one. The exact list names every allowed failure and why.
- **`--stage E2`,** because it runs every group (A1–A4). E1 grades only the contract group, which is a subset.

## How to verify

```sh
just contract-tests        # this step alone; the report is in .artifacts/contract-tests.txt
just check                 # the whole gate, with this step in it
```

Negative check: removing an entry from `KNOWN_FAILING` makes the step fail with
`FAIL (unexpected): <test name>`, and adding a test that passes makes it fail with
`PASSES NOW — remove it from KNOWN_FAILING`.
