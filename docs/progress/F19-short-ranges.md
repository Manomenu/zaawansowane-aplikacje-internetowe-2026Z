# F19 - short ranges for a live signal: 15 min and 3 h presets, newest data first, a capped table

Date: 2026-10-10. The owner demos a signal sent every second and needs ranges short enough to see it.

## What was met

| Code | Scope |
| --- | --- |
| F5 | **Extended.** The presets are 15 min, 3 h, 24 h, 7 days, 30 days (shortest left); the default stays 7 days. A preset still follows "now" and the live stream, and the live window now slides. |
| F10 | **Still met.** The five buttons wrap inside the filters; the 360 px and 12-series fit tests pass unchanged. |

## What was done

- **Presets** (`range.ts`): `15m` and `3h` added, durations in minutes. Tests check the order, the durations and the default.
- **Newest data when the limit bites:** the request was already `sort=-timestamp&limit=10000`; `MEASUREMENTS_LIMIT` is now exported and when the answer has that many measurements `Dashboard` shows a `role="status"` line "Showing the newest 10,000 measurements of this range - narrow the range to see all." (`limitNotice` in `table.ts`, numbers locale-formatted).
- **Table cap:** `capRows` keeps the newest `MAX_ROWS` = 500 rows (`limits.ts`) and returns the line "Showing the newest 500 of 10,800 rows", shown above the table (and printed - it is not `no-print`). Charts get every row; selection and keyboard handling are unchanged.
- **Sliding live window** (`live.ts` `slideWindow`, `useDashboardData.ts`): for a live range that came from a preset, every point from the stream first goes in, then everything older than (the point's time - preset length) leaves. The state keeps the same array when nothing left. A hand-typed live range keeps its fixed start.
- **Axis ticks** (`axis.ts`): `Intl.DateTimeFormat` options chosen from the span of the plotted data - h:mm:ss up to 30 min (15 min), h:mm up to 6 h (3 h), date and h:mm beyond.
- **Tests:** vitest for presets, `capRows`, `limitNotice`, `slideWindow`, `axis`; e2e for the preset order, "15 min" giving a 15-minute range, and a seeded series of 520 points (one per second, posted in parallel batches of 40, about 16 s with the page) proving the cap line, 500 rendered rows, newest row kept, oldest cut.

## Why this way

- **Cap in the table only:** a chart with 10,000 points is fine for SVG as drawn today; 10,000 DOM rows with tab stops are not. 500 rows is a screen or two of scrolling at 1 s data (about 8 min).
- **`MAX_ROWS` in its own import-free file** so the browser tests (compiled without the Vite types) can read it; no override for tests, as the real constant is exercised with 520 points.
- **Slide on arrival, not on a timer:** no new timer or effect; a silent signal simply stops sliding (the "Range:" heading and the From/To inputs show the range as of the click). Left out: a ticking window and a heading that follows it - added if the owner wants them.
- **Notice from the count, not from a header:** the server returns no total; a full page is the only sign and is exactly the case to warn about.
- **Left out:** a 1 min preset, seconds in the From/To inputs (they are minute-precision), downsampling the chart.

## How to verify

```bash
cd pomiary_web && pnpm exec tsc --noEmit -p tsconfig.app.json && pnpm exec tsc --noEmit -p tsconfig.node.json \
  && pnpm exec eslint . && pnpm exec prettier --check . && pnpm exec vitest run && pnpm exec knip
cd .. && ./scripts/.internal/e2e.sh
```

By hand: run the generator at a 1 s interval, open the dashboard, choose "15 min" - the line grows on the right and the oldest points leave on the left; ticks show seconds.
