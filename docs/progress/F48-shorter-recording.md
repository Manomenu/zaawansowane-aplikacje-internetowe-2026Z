# F48 - A shorter recording plan, only what the video is graded for

## What was met

B1, B2 and B3 stay `in progress` (the video is still to record). The planned minutes in the
E2 checklist follow a plan of 5:10 instead of 6:50.

## What was done

- `docs/submissions/lista-kontrolna-e2.md`: new planned minutes for every row. B4, B5 and X3
  get "n/d" in the minute column with where they are checked instead (the ZIP, the PDF, the
  CI link in the form).
- `docs/requirements.md`: the B2 row names the new minutes.
- The owner's recording script (outside the repo) was cut to what the specification grades
  from the video.

## Why this way

The owner could not fit the old plan into 7 minutes. The specification's part B table says
what must be visible in the video: B1 (F1-F13), B2 (mobile and print), B3 (two security
measures), plus X1 and X2 ("nagranie"), and the full sensor cycle. B4 is checked "w archiwum",
B5 is the documentation and X3 is "link w formularzu", so their scenes (archive listing, PDF,
CI page) went. Scenes were also merged: F11, F2 and F3 on the first screen; F5 with F6; the
password change moved next to the logout; X2 sends with the demo sensor's key, so no extra
sensor has to be prepared. 5:10 leaves 1:50 before the 7:00 limit and stays above 5:00.

## How to verify

    grep -n 'n/d' docs/submissions/lista-kontrolna-e2.md   # B4, B5, X3, X4
    just package --stage e2   # lista-kontrolna-e2.pdf builds
