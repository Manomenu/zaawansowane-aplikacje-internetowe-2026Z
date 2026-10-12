# F39 — lighter sample data: a value every 6 hours

Date: 2026-10-12. Seeding the deployed app with every hourly value (8 640 requests) ran at about 5 requests a
second through the tunnel, half an hour. The owner asked for far fewer values, still visible in the default
90-day view until grading.

## What was met

| Code | Scope |
| --- | --- |
| F11 | **Kept, lighter.** 12 series × 120 values (30 days, one every 6 h): far above "3 series × 15 points", 1 440 requests, about 5 minutes. |
| F13 | **Extended.** `seed --step` (whole hours, default `6h`; `1h` sends every hourly value). |

## What was done

- `pomiary_generator/pomiary_generator/seed.py`: `run_seed(..., step_hours=1)` keeps every `step_hours`-th value
  counted back from the newest, so the newest value is always sent.
- `pomiary_generator/pomiary_generator/cli.py`: `seed --step`, default `6h`; anything but a whole number of
  hours is refused with a message.
- `scripts/.internal/contract-tests.sh`: the gate's seeding passes `--step 1h`, keeping 24 values per series for
  the teacher's F11 test (6 h would leave 4).
- `pomiary_generator/tests/test_seed.py`: two days at 6 h are 8 values per series, ending with the newest hour.
- The generator's README, `docs/documentation.md` and `docs/recording.md` describe the new spacing.

## Why this way

- **How long the samples stay visible depends on the newest value**, not on how many there are: the 90-day
  view shows them for about 90 days after the run. So the run is made lighter by spacing, not by fewer days.
  Re-seeding before each deadline (7 Nov, 21 Nov) keeps them visible until about mid-February.
- **6 h, not daily:** four points a day still draw a daily temperature curve; daily values would flatten it.
- **Counted back from the newest:** the series then end at the latest hour, so the 15-minute and 3-hour
  presets still show the freshest value right after a run.

## How to verify

```sh
cd pomiary_generator && uv run pytest -q tests/test_seed.py
python -m pomiary_generator seed --step 90m ...   # error: --step must be a whole number of hours
./scripts/.internal/contract-tests.sh             # F11 still passes with --step 1h
```
