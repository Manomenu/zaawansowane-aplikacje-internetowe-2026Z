# F49 - Every checklist row gets a minute in the recording

## What was met

B1-B5 and X1-X3: every row of the E2 checklist now has a planned minute in the video, so no
point depends on how the specification is read. B1-B3 stay `in progress` until the take.

## What was done

- `docs/submissions/lista-kontrolna-e2.md`: B4 and B5 at 5:35, X3 at 5:50 (no more "n/d"
  except X4, which is not done); F3 and F4 also at 3:45, the new series edit scene; later
  rows moved by the scenes added before them.
- `docs/requirements.md`: the B2 row names the new minutes.
- The owner's recording script (outside the repo), plan 6:00:
  - back: a 15 s scene with the archive listing and the ERD in the PDF (B4, B5), and 5 s on
    the CI page (X3);
  - new: editing the demo series - a range that would exclude stored measurements is
    refused by the server (the second half of F4), a colour change is saved and the series
    deleted (the admin's series management in F3);
  - the tablet width (768 px) next to 360 px (F10 names phone, tablet and computer);
  - the backfill command names `--api` on screen (F13 lists the API address among what
    the user sets).

## Why this way

The owner wants every point certain. F48 cut B4, B5 and X3 from the video because the
specification checks them in the archive, the PDF and the form, but it also says the
checklist gives "for each element B1-B5 and the extensions" the minute of the video where it
is visible. Twenty seconds of video removes that doubt. Reading F1-F13 sentence by sentence
showed three more parts no scene had: the refused range change (F4), editing and deleting a
series (F3) and the tablet (F10). 6:00 still leaves a minute before the 7:00 limit.

## How to verify

    grep -c 'n/d' docs/submissions/lista-kontrolna-e2.md   # 1 (X4)
    just package --stage e2
