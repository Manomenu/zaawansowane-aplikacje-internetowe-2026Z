# F12 — the ERD and the source of the PDF documentation

Date: 2026-10-09. Project stage: before E2 (the documentation is part of the final submission).

## What was met

| Code | Scope |
| --- | --- |
| B4 | **Repository part met.** The ERD (`docs/erd.md`, rendered to `docs/erd.svg`) with a description of every table and relationship, and the migration `001_schema.sql`, which is also the SQL script. Stays `in progress` until the ZIP archive is built at submission. |
| B5 | **Source written.** `docs/documentation.md` follows the seven parts the specification requires for the PDF (plus short sections on technologies and extensions). Stays `in progress`: the PDF itself, the administrator login and the deployment facts (marked TODO in the file) come at submission. |
| B3 | **Described.** Section 5 of the documentation describes two T5 elements (sensor API keys; Argon2id passwords with opaque expiring session tokens): what, where in the code, what they protect against. The recording is still to do, so `in progress`. |

## What was done

- `docs/erd.md`: a Mermaid `erDiagram` of the five tables exactly as in `001_schema.sql`
  (types, PK/FK/UK markers, cardinalities), then a description of each table, each
  relationship with its `ON DELETE` rule and reason, the `(series_id, measured_at)` index and
  the query it serves, and what is stored hashed.
- `docs/erd.svg`: the diagram rendered with mermaid-cli (HTML labels switched off, so the SVG
  has no `foreignObject` and also renders in PDF tools, not only browsers).
- `docs/documentation.md`: the seven required parts — addresses and repository, administrator
  login (placeholder), running locally with tool versions, commands and every generator
  parameter, the ERD with a short description, the two security elements with file and function
  names, the API extensions, the AI declaration — plus technologies (T1–T4) and extensions
  (X1–X3). About 2 400 words with tables and the ERD image: roughly 6 A4 pages.
- Requirements rows B3, B4, B5 set to `in progress` with this file as proof.

- **X3 closed when integrating (2026-10-10):** CI (`.github/workflows/ci.yml`) is green on
  `master` — run for `b6cf560`: `test` (the whole gate, including the teacher's tests against a
  local server), `e2e` (34 browser tests, axe in both colour schemes) and both image builds.
  The documentation links the workflow's page instead of a TODO.

## Why this way

- **A Mermaid block in Markdown, rendered to SVG:** the diagram stays text in git (reviewable,
  diffable) and the SVG is what the PDF embeds. Alternatives left out: a drawing tool
  (binary, not diffable) and a database-schema generator (it would draw the schema without the
  explanations the course asks for).
- **Unchecked deployment facts are TODOs, not guesses:** the address, the login and the CI link
  are submission-time facts; a password never enters the repository.
- **Claims were checked against the code and the contract:** `sensorId`, `createdAt`,
  `lastMeasurementAt`, `icon`, `unit` and `apiKey` are already in `zai-api-26z.yaml`, so the only
  extension of the contract is the stream path; the rest are stricter rules, listed as such.
- Left out: a longer description of the web app's screens and of the CI; the PDF is limited to
  8 pages and the specification asks for these seven parts.

## How to verify

```sh
./scripts/.internal/requirements.sh
grep -c "<foreignObject" docs/erd.svg          # 0
grep -o "admins\|sessions\|series\|sensors\|measurements" docs/erd.svg | sort -u
```

Re-render after changing the diagram (the Mermaid block of `docs/erd.md` saved as `erd.mmd`):

```sh
npx --yes @mermaid-js/mermaid-cli -c mm.json -i erd.mmd -o docs/erd.svg   # mm.json: {"htmlLabels": false}
```

Compare the tables in `docs/erd.md` with `pomiary_server/pomiary_server/migrations/001_schema.sql`;
read `docs/documentation.md` section 5 beside `auth/store.py` and `sensors/store.py`.
