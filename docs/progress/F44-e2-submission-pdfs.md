# F44 — the E2 form and checklist as signed PDFs

Date: 2026-10-13. On Leia, E2 is files only (up to 20, 250 MB in all), no form fields. The owner asked for the form
and the checklist as formal, signed PDFs like the documentation, with nothing in them meant for himself.

## What was met

| Code | Scope |
| --- | --- |
| B1–B5 | **Delivered as a document.** `lista-kontrolna-e2.pdf`: each item B1–B5 and each extension, done or not, the minute of the recording and where it is in the repository. |
| T10, A1–A5 | **Handed over.** `formularz-e2.pdf`: the application and API address (the bare host, paths under `/api`), the test admin account, the repository, CI and the list of uploaded files. |

## What was done

- `docs/submissions/formularz-e2.md` and `docs/submissions/lista-kontrolna-e2.md` (Polish, the author block with
  `{{DATA}}`); `docs/checklist.md` moved into the latter, without "draft" and without the notes to the owner, which
  went into an HTML comment.
- `scripts/.internal/package.sh`: `render_pdf` renders any of the three sources the same way — placeholders
  (`{{ADMIN_USERNAME}}`, `{{ADMIN_PASSWORD}}`, `{{DATA}}` as today's date in Polish), the TODO and placeholder checks,
  the running footer with the document's own name, page numbers. E2 now gives `dokumentacja.pdf` (7 pages),
  `formularz-e2.pdf` (1) and `lista-kontrolna-e2.pdf` (2) plus the ZIP; the E1 Markdown form stays, since E1 has fields.
- References updated: `docs/recording.md`, `docs/development.md`, `docs/requirements.md`, `AGENTS.md`, `justfile`.

## Why this way

- **One renderer for three documents:** the same style, footer and checks; a second copy of the HTML and Chromium
  steps would drift.
- **The date is the build date** for the form and the checklist (they are built at submission); the documentation
  keeps the date the owner set.
- **Only the documentation goes into the ZIP:** the specification lists the form, the checklist and the recording as
  separate items; they are uploaded beside the ZIP.

## How to verify

```sh
just package --stage e2 && ls .artifacts/submissions/e2/    # 3 PDFs + the ZIP
pdftotext -l 1 .artifacts/submissions/e2/formularz-e2.pdf - | head -20
```
