# F42 — the documentation is signed and reads as a formal document

Date: 2026-10-13. The teacher's consultation slides (10 Oct 2026) say the documentation is a formal document,
**signed** — at least name, surname, index number, course name and date — following the usual editorial rules
of technical documents, delivered as PDF.

## What was met

| Code | Scope |
| --- | --- |
| B5 | **Completed against the slides.** The PDF opens with the author block (Piotr Gugnowski, index 320690, Zaawansowane aplikacje internetowe (2026Z), 13 October 2026), has page numbers "strona X z Y" and a running footer, and carries no notes meant for the repository. |

## What was done

- `docs/documentation.md`: a title and the author block (a key-value table in `<div class="doc-meta">`); the
  note about how the file is built moved from a visible quote into an HTML comment, which the PDF does not show;
  the sentence about the placeholders in section 2 removed (the comment covers it).
- `scripts/.internal/package.sh`: `@page` margin boxes with the footer and "strona X z Y" (Chromium supports
  them), a little more bottom margin, the author in the HTML title, and key-value tables without their empty
  header row.
- Checked against the other slides, nothing to change: foreign keys with a reasoned `ON DELETE` (section 4),
  validation in the forms and always on the server, parameterised SQL, Argon2id, `@media print`, PDF format.

## Why this way

- **A header block, not a title page:** a separate title page would cost one of the 8 pages; the block gives the
  same facts on page 1 and the PDF stays at 7 pages.
- **Repository notes as HTML comments:** they still help whoever edits the Markdown, and marked passes them
  through to the HTML, where they are not rendered.

## How to verify

```sh
just package --stage e2                                         # dokumentacja.pdf: 7 pages
pdftotext -l 1 .artifacts/submissions/e2/dokumentacja.pdf - | head -12   # title and the author block
pdftotext .artifacts/submissions/e2/dokumentacja.pdf - | grep "strona"   # strona 1 z 7 … strona 7 z 7
```
