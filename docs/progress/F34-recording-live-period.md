# F34 — a faster wave for the live part of the recording

Date: 2026-10-11. The owner wanted the live sine in the video to go from maximum to minimum in about 10 s.

## What was met

| Code | Scope |
| --- | --- |
| X1 | **Kept, easier to show.** The live command in the recording plan uses `--period 20s`: max to min in 10 s, so the 25 s scene shows more than a full wave arriving point by point. |

## What was done

- `docs/recording.md`: the 3:30 command gets `--period 20s` and its comment says why; the X1 row says to pick
  the 15 min preset first, so the axis spans the last minutes and the new points are not squeezed into a
  sliver of a 24 h axis.
- The generator's default live period stays 60 s (`LIVE_PERIOD_SECONDS`); only the video's command changes.

## Why this way

- **20 s, not slower:** with one value per second a 20 s period is still 20 points per wave, a smooth curve;
  in 25 s the viewer sees the values rise and fall, which shows "live" better than a slow slope.
- **A flag, not a new default:** the default was set earlier on request (max to min in 30 s) and other runs
  rely on it; the recording is the one place that wants it faster.

## How to verify

```sh
cd pomiary_generator && python -m pomiary_generator send --interval 1s --count 21 --shape sine \
  --min 10 --max 90 --period 20s --dry-run --api http://x --api-key k
# about 21 s: the maximum (~90) and the next minimum (~10) are 10 lines apart
```
