# F18 — a fast live sine for the demo

Date: 2026-10-10.

## What was met

| Code | Scope |
| --- | --- |
| F13 | **Met, extended.** The generation mode for the live demo: with `--interval`, a synthetic sine now goes from maximum to minimum in 30 seconds (default period 60 s), so a 1 s interval draws a visible wave. Backfill keeps its daily cycle. |

## What was done

- `synthetic.py`: two named constants, `LIVE_PERIOD_SECONDS` (60 s) and `BACKFILL_PERIOD_SECONDS` (24 h).
- `cli.py`: `--period` has no fixed default any more; when it is missing, the live or the backfill constant is used. An explicit `--period` wins in both modes. `--help` and the README say "default 60s live, 24h backfill".
- The sine phase was already the wall-clock time (`timestamp() / period`, aligned to the Unix epoch); it stays so, and a test pins it. Two generators started at different moments therefore stay in phase. `random`, `random-walk` and `constant` are unchanged; `--noise` still applies and the value is still clamped to the range.
- `docs/recording.md`: the live command is `--interval 1s --count 25 --shape sine --min 10 --max 90` (no `--period` needed), and the segment says a point appears every second.
- Tests: default period per mode, an explicit `--period` in both modes, a full-range wave falling from maximum to minimum in 30 s, phase independent of the generator's start, noise on the live sine. The live tests use an injected clock and no sleeping.

## Why this way

- One constant per mode instead of a literal in the parser: the choice is visible in one place and testable.
- The mode is decided by `--interval`, as everywhere else in `send`, so no new flag is needed.
- Alternative left out: a separate `--wave-speed` option; the existing `--period` already says it.

## How to verify

- `cd pomiary_generator && env -u VIRTUAL_ENV uv run pytest -q`
- `uvx ruff check pomiary_generator && uvx ruff format --check pomiary_generator && env -u VIRTUAL_ENV uv run pyright`
- Visually: `python -m pomiary_generator send --dry-run --interval 1s --count 61 --shape sine --min 0 --max 100`
  shows 0, rising to 100 at about 15 s, falling to 0 at about 45 s, and back.
