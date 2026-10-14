# F50 - The real minutes of the recording

## What was met

B1, B2 and B3 are `done`: the video is recorded (6:57, within the 5-7 minute limit) and every
row of the E2 checklist names the minute where its code is said and shown. B4, B5 and X1-X3
also have their real minutes.

## What was done

- `docs/submissions/lista-kontrolna-e2.md`: the planned minutes replaced by the ones of the
  final take: F11/F2/F3 0:00, F5/F6 0:38, F8/F9 1:01, the series form 1:23, sensor
  registration 1:44, F1/F13 2:08, X1 2:48, X2 3:08, the rejection 3:25, unregistering
  3:50, series edit 4:11, password 4:46, 360 px 5:08, print 5:25, B3 5:40, B4/B5 6:23,
  X3 6:47.
- `docs/requirements.md`: B1-B3 point to this file, B2 names the new minutes.
- The video itself is not in the repo: the owner's fragments, joined with ffmpeg, go to Leia as
  `nagranie-e2.mp4`.

## Why this way

The take came out at 7:21 at first. The sensor cycle (registration, key, sending, live
chart, real data, rejection, unregistering) was kept whole, as the specification demands it;
the time came from a loose talk fragment with no requirement in it and from silence at the
end of other fragments. The minutes are computed from the fragments' lengths after those
cuts, then checked by the owner against the moment each code is said in the final file.

## How to verify

    grep -c 'n/d' docs/submissions/lista-kontrolna-e2.md   # 1 (X4)
    ffprobe -v error -show_entries format=duration -of csv=p=0 ~/Videos/Obs/nagranie-e2.mp4   # 417.2
    just package --stage e2
