# F0 — initializing the repository from the template

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07).

## What was met

| Code | Scope |
| --- | --- |
| T1 | **Met.** Python backend: FastAPI (`pomiary_server/`), started with `just server`, tested with pytest against a real PostgreSQL. |
| T2 | **Partly.** SPA skeleton in React 19 + Vite + Mantine (`pomiary_web/`), with strict TypeScript, eslint and vitest. There are no application views yet. |
| T3 | **Partly.** The contract `docs/spec/zai-api-26z.yaml` is in the repo and protected by a checksum (`docs/spec/SHA256SUMS`): changing it stops the gate. There are no endpoints yet. |
| T4 | **Partly.** PostgreSQL 17 locally (`just db up`), in CI and in `just up`. Numbered SQL migrations with checksums (`pomiary_server/pomiary_server/migrations/`, `db.py`). There is no domain schema yet. |
| T9 | **In progress throughout the project.** Repository `github.com/Manomenu/zaawansowane-aplikacje-internetowe-2026Z`, branch `master`. Commits are made by `suwgit push` after each finished piece of work, and the commit message is written by a local LLM. gitleaks scans the whole history. |
| X3 | **Partly.** `.github/workflows/ci.yml` runs the same gate as `just check` on every push, plus the browser tests. The green status will appear after the first push. |

## What was done

- Copied the `solid-app-tpl` template (FastAPI + React + PostgreSQL + Helm + compose + CI) and
  ran `scripts/init-project.sh pomiary 2`. The `myapp` names were replaced with `pomiary`.
  The ports have an offset of 2 so they do not collide with automat-operat (0) and grzyby-mcp (1):
  server 6220, web 3220, database 5453, container stack 8092.
- Moved the teacher's files to `docs/spec/` (`zai-projekt-26z.pdf`, `zai-api-26z.yaml`,
  `zai-tests.mjs`) and recorded their SHA-256 checksums in `docs/spec/SHA256SUMS`.
- Added the requirements matrix `docs/requirements.md`: every code F1–F13, T1–T11, A1–A5, B1–B5
  and extension X1–X4 has a row with a status and a proof.
- Added the gate step `requirements` (`scripts/.internal/requirements.sh`, run first in
  `scripts/.internal/check.sh`, i.e. in `just check` and in CI). It checks:
  1. that the files in `docs/spec/` are unchanged;
  2. that every requirement code has a row with a valid status;
  3. that a `done` row points to an existing progress file that mentions that code;
  4. that every `docs/progress/F*.md` file has the sections "What was met", "What was done",
     "Why this way" and "How to verify".
- `AGENTS.md` describes three deviations from the template forced by the course:
  - commits only through `suwgit push`;
  - own administrator login and sensor keys instead of Cloudflare Access, because the
    teacher's tests go to the public address without Access;
  - the "Course requirements" section with the rules for keeping the matrix and progress files.
- Added `.gitleaks.toml`: the default gitleaks rules plus an exemption for exactly one file,
  `docs/spec/zai-tests.mjs`. The teacher's script deliberately contains a forged JWT
  (`alg: none`, the test "Forged token: 401") and a sample password, and the pre-commit hook
  rejected the commit because of them. The file must not be changed, so the exemption opens no
  loophole: the checksum detects any change of its content.
- Set the image registry in `deploy/chart/values.yaml`
  (`ghcr.io/manomenu/zaawansowane-aplikacje-internetowe-2026z`, as published by CI).
  The public address is to be `pomiary-lasy.gugnowski.com`; the platform repo will set it.

## Why this way

- **A template instead of writing from scratch.** The quality gate, CI, images, Helm and e2e
  tests are ready and proven in other projects, so the time goes into the course requirements.
- **FastAPI (T1).** Pydantic validates input: 422 for a wrong type or a missing field.
  It also gives automatic OpenAPI, from which the frontend generates types (`just api-types`).
  The alternatives (Express/NestJS, Spring) were dropped because the owner's whole ecosystem
  is in Python.
- **PostgreSQL with plain SQL and numbered migrations (T4).** The specification asks for an
  "SQL script or migrations", and the `NNN_*.sql` files are at once the migrations and the script
  for the archive (B4). PostgreSQL also has the TimescaleDB extension, a path to extension X4
  without changing the database.
- **The teacher's files locked by a checksum.** The contract must not change (T3), and the test
  script is the basis of grading. An accidental edit (formatting, a "fix") should stop the gate
  before it reaches grading.
- **The requirements matrix is checked by the gate, rather than being a list in a note.** A
  `done` status without proof does not pass CI, so the checklist for E2 is built continuously
  and cannot drift from reality. A drift found in a spot check costs -5 points.
- **Domain: forest conditions for grzyby-mcp.** The series (precipitation, temperature, soil
  moisture at several locations) have natural min/max ranges (F2, F4). The generator can read
  real data from Open-Meteo (X2): free for non-commercial use, under 10,000 requests per day,
  and we need a few dozen. The application does not depend on Open-Meteo at runtime.
- **Left out at this stage:** the database schema, endpoints, running `zai-tests.mjs` in the
  gate. They will arrive with the first code that needs them (KISS, AGENTS.md section 0).

## How to verify

```sh
just check                                  # the whole gate; the first step is "requirements"
./scripts/.internal/requirements.sh         # the requirements step alone
(cd docs/spec && sha256sum --check SHA256SUMS)
```

Result of `just check` on 2026-10-09: all steps PASS (requirements, ruff, pyright,
import-linter, pytest, tsc, eslint, prettier, vitest, knip, API types, helm, shellcheck,
gitleaks, compose).

Negative check: appending a character to `docs/spec/zai-api-26z.yaml`, or setting `done`
without a proof in `docs/requirements.md`, gives `FAIL requirements`.
