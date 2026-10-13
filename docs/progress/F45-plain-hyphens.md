# F45 - Plain hyphens in the submitted documents

## What was met

B5 and the E1/E2 forms, editorial only: the documents the teacher reads use plain hyphens
instead of em and en dashes. No requirement changes status.

## What was done

- `docs/documentation.md`, `docs/submissions/formularz-e2.md`,
  `docs/submissions/lista-kontrolna-e2.md` and `docs/recording.md`: every `—` and `–`
  replaced with `-`. In section 1 of the documentation a dash that began a continuation
  line moved to the end of the previous line, so Markdown does not read it as a list item.
- `scripts/.internal/package.sh`: the same in the E1 form table and the three PDF footers.
  Its terminal messages (English, never submitted) are left as they were.

## Why this way

The owner asked for the documents to read like typed by hand. A hyphen is what a keyboard
gives; ranges (`B1-B5`, `1-N`) read the same with it. Arrows in the ERD table stay: they
mean a relation's direction, not punctuation.

## How to verify

    grep -c '[—–]' docs/documentation.md docs/submissions/*.md docs/recording.md   # all 0
    just package
    for f in .artifacts/submissions/e2/*.pdf; do pdftotext "$f" - | grep -c '[—–]'; done   # all 0
