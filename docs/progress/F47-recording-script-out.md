# F47 - The recording script leaves the repository

## What was met

B1 and B2 stay `in progress` (the video is still to record). Their plan moves out of the repo:
it is the owner's working script, not something the teacher reads or a check runs.

## What was done

- `docs/recording.md` deleted. Its content now lives in the owner's private page outside the
  repo, with ticks per step, the exact buttons and fields to click and a copy button per command.
- References updated: `AGENTS.md` (the Polish exception no longer names it),
  `docs/development.md`, `docs/requirements.md` (B1, B2), the comment in
  `docs/submissions/lista-kontrolna-e2.md`.
- Two corrections found while writing the clicks, made only in the new script: the web app
  refuses a new password equal to the current one, so the F9 scene changes it to a temporary
  one and the owner restores the real one afterwards; and the X2 scene uses a sensor
  registered before the take, since the seed's keys are not kept anywhere.

## Why this way

The owner asked for the script as a page to work through, not a file to read. Keeping both
would mean two copies drifting apart; the minutes the teacher sees stay in
`docs/submissions/lista-kontrolna-e2.md`.

## How to verify

    test ! -e docs/recording.md
    grep -rn 'recording\.md' AGENTS.md docs/development.md docs/requirements.md docs/submissions   # nothing
    just check
