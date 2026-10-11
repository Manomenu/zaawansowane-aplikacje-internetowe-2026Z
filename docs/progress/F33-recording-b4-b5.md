# F33 — the recording shows B4 and B5

Date: 2026-10-11. The owner asked whether the ERD, the migrations and the documentation should appear in the
video.

## What was met

| Code | Scope |
| --- | --- |
| B4 | **Shown, besides delivered.** The recording plan has a scene listing the archive: `docs/erd.svg`, both migrations and the PDF; the checklist gets its minute (6:25). |
| B5 | **Shown, still in progress.** The same scene shows the PDF's ERD section and its sections 1–9; the checklist gets its minute. The deployment TODOs remain. |

## What was done

- `docs/recording.md`: a 15 s scene at 6:25 (`unzip -l … | grep -E 'erd|migrations/|dokumentacja'`, then the
  PDF at section 4 and a scroll through the headings), its command among the commands to paste, and a
  preparation step (`just package` before the take, the PDF open in a tab). X2 shortened to 15 s and X3 to
  10 s to make room; total 6:50 of 7:00.
- `docs/checklist.md`: B4 and B5 at 6:25 instead of "n/a", B4 lists `002_unique_names.sql` too; X3 moves to
  6:15.

## Why this way

- **The specification is not fully clear:** B4 says "in the archive", but part B is graded "from the
  recording and the checklist", and the checklist asks for a minute for every item B1–B5. A 15 s scene is
  cheaper than the risk of 4 points graded zero-one on an empty minute.
- **X2 and X3 give up the time:** they had slack; the sensor cycle (2:35–4:50) is never shortened.
- **The listing comes from the real ZIP**, the one `just package` builds for submission, not from the
  repository tree.

## How to verify

```sh
just package --stage e2
unzip -l .artifacts/submissions/e2/pomiary-zai-26z.zip | grep -E 'erd|migrations/|dokumentacja'   # erd.md, erd.svg, 001, 002, the PDF
grep -n "6:25" docs/recording.md docs/checklist.md
```
