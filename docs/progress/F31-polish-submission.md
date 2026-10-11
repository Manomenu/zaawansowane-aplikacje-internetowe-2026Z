# F31 — the submission in Polish: form, documentation, checklist

Date: 2026-10-11. The owner asked `just package` to produce the submission in Polish: the form, the
documentation and the checklist.

## What was met

| Code | Scope |
| --- | --- |
| B5 | **Kept, in progress.** The documentation is the same content in Polish, the course's language; the PDF stays at 6 of 8 pages. The deployment TODOs remain. |

The checklist (B1–B5 and the extensions) and the forms for E1 and E2 are in Polish too.

## What was done

- `docs/documentation.md` translated into Polish (by a Sonnet subagent, then checked): every code span,
  code block, link, URL, table shape and TODO compared with the English version by a script and found
  identical; terms aligned with the specification ("prowadzący", not "nauczyciel"); comments in the code
  blocks translated.
- `docs/checklist.md` translated; paths and planned minutes unchanged.
- `scripts/.internal/package.sh`: the forms are written in Polish, the PDF's HTML is `lang="pl"`, and the
  output files have Polish names: `formularz.md`, `dokumentacja.pdf`, `lista-kontrolna.md`. The script's
  own messages stay English.
- The language rule in `AGENTS.md` gains one exception: what the teacher reads at submission is Polish.
  `justfile`, `docs/development.md` and the scripts table in `AGENTS.md` describe it.

## Why this way

- **Replaced, not duplicated:** an English and a Polish copy of the documentation would drift apart; the
  graded one is the one the teacher reads, so only the Polish one is kept.
- **Source file names stay English** (`docs/documentation.md`, `docs/checklist.md`): the repository's names
  are English and other files link to them; only the outputs the teacher receives have Polish names.
- **`docs/requirements.md` stays English:** it is not submitted on its own, and the gate parses its statuses.
- **`docs/recording.md` stays English:** it is the owner's script for the take, not something submitted.

## How to verify

```sh
just package
ls .artifacts/submissions/e1 .artifacts/submissions/e2   # formularz.md; dokumentacja.pdf, formularz.md, lista-kontrolna.md, ZIP
pdftoppm -r 70 -png -f 1 -l 1 .artifacts/submissions/e2/dokumentacja.pdf /tmp/strona   # Polish text, diacritics render
```
