# F15 — the E2 submission package and the recording script

Date: 2026-10-10. Project stage: preparing the final submission (E2).

## What was met

| Code | Scope |
| --- | --- |
| B4 | **Met.** `just package` builds a ZIP that contains the ERD (`docs/erd.svg`, `docs/erd.md`) and the migrations (`pomiary_server/pomiary_server/migrations/001_schema.sql`); the script fails if either is missing. |
| B5 | **PDF part met.** `documentation.pdf` is built from `docs/documentation.md` with the ERD embedded, A4, 5 pages (limit 8, enforced by the script). Stays `in progress`: the deployment facts and the administrator login in sections 1 and 2 are still TODO. |
| B1 | **Scripted.** `docs/recording.md` plans F1–F13 minute by minute with the code to say before each, and `docs/checklist.md` maps each to a minute and a place in the repository. The recording itself is pending, so `in progress`. |
| B2 | **Scripted.** The mobile view at 360 px (4:50) and the print preview (5:10) are in the plan. The recording is pending, so `in progress`. |

B3 and the extensions are also planned in the script and the checklist (B3 at 5:20, X1 3:30,
X2 6:00, X3 6:20; X4 is not claimed), but their rows are not changed here.

## What was done

- `scripts/.internal/package.sh` (`just package`, group maintenance; a row in AGENTS.md
  section 10): renders `docs/documentation.md` to HTML with `marked` (through `npx`, pinned
  version), prints it to PDF with Playwright's Chromium (A4, small print CSS), counts the pages
  with `pdfinfo` and fails above 8; then zips the repository files (`git ls-files --cached
  --others --exclude-standard`, working-tree content, without `.artifacts/`) and adds the PDF.
  It fails on a tracked real `.env`, on `node_modules` / `.venv` / `.git` in the list or in the
  ZIP, and when `.env.example`, `docs/erd.svg`, a migration or the generator is missing. It prints
  the page count, the file count and the ZIP size. Output: `.artifacts/submission/`.
- `docs/recording.md`: preparation (screen layout, clean profile, logged out, env vars, where the
  rejection log shows), a 6:45 timeline with the code to say or show, the full sensor cycle
  (register, key into the generator, send and see on the chart, out-of-range rejected, unregister
  and 401), the exact generator commands to paste, and what to do after the take.
- `docs/checklist.md`: a draft of the platform's checklist (B1 per F-code, B2, B3, B4, B5, X1–X4)
  with "declared", the planned minute and the repository location.
- Requirements rows: B4 `done`; B1, B2 `in progress`; B5 stays `in progress`.

## Why this way

- **Markdown to PDF through `marked` and Chromium:** nothing new is installed (`pandoc`,
  `weasyprint`, `typst` and LaTeX are absent on this machine; Playwright's Chromium is already a
  dependency of the e2e tests and `lighthouse.sh`, and `npx` is used the same way there). The SVG
  of the ERD is embedded as an image. Alternatives left out: a Node dependency in the web
  package (it would be a dependency for one script), pandoc (not installed).
- **`git ls-files` including untracked, not-ignored files:** the ZIP then holds what the
  repository will hold once the pending files are pushed, and never ignored files such as
  `node_modules` or `.env`; read-only use of git.
- **The script checks the contents, not only the size:** the teacher asks for specific parts
  (`.env.example`, migrations, generator, PDF), so a missing one is a failure, not a surprise at
  the upload.
- **The video plan keeps 15 s of reserve and puts the sensor cycle in one block** that is never
  cut; the cluster-side parts (the `kubectl logs` pane, `psql` on production) are optional with a
  stated fallback, because they depend on access the script cannot check.
- Left out: a CI job for the package (it is a manual, one-off step before submission).

## How to verify

```sh
shellcheck scripts/.internal/package.sh
just package
# prints: documentation.pdf: 5 pages / pomiary-zai-26z.zip: <n> files, <size> / OK
unzip -Z1 .artifacts/submission/pomiary-zai-26z.zip | grep -E '(^|/)\.env\.example$|migrations/.*\.sql|^docs/erd\.svg$|^documentation\.pdf$'
unzip -Z1 .artifacts/submission/pomiary-zai-26z.zip | grep -c node_modules   # 0
pdftoppm -r 60 -png .artifacts/submission/documentation.pdf /tmp/doc && echo "look at the pages"
./scripts/.internal/requirements.sh
```

For the video: follow `docs/recording.md` with a stopwatch, then confirm the minutes in
`docs/checklist.md`.
