# F21 - last 90 days as the default view; chart axes follow the data

Date: 2026-10-10. The owner wants the teacher to see the series until grading, even without fresh data.

## What was met

| Code | Scope |
| --- | --- |
| F5 | **Extended.** A 90 days preset joins 15 min, 3 h, 24 h, 7 days and 30 days (in this order) and is the default. It is a normal preset, so it follows "now" and the live stream. The summary reads "Last 90 days · 12 of 12 series". |
| F11 | **Met for grading.** The sample data (30 days of hourly values) stays visible on opening the dashboard for about 60 days after the last measurement, with no clicks. |

## What was done

- `range.ts`: preset `90d` added, `DEFAULT_PRESET` is `90d`.
- `axis.ts`: `dataDomain(first, last)` gives the x-axis domain: the oldest to the newest plotted point, and a 5-minute window each side for a single point. `UnitChart.tsx` uses it for the axis and for the tick format, so both follow the data.
- The "Range:" heading and the From/To inputs still show the selected range.
- The 10,000-measurement limit and its notice are unchanged; 90 days of 12 series may trigger it.
- Tests: vitest for the preset order and durations, the default, the summary and `dataDomain`; e2e for the default (the summary, the pressed preset, a 90-day From/To) and for tick labels of a chart whose data spans a few hours inside the 90-day range (times of day, not dates).
- Docs: `docs/design.md` (dashboard), `docs/recording.md`.

## Why this way

- **A preset, not a special case:** live updates, the sliding window and the summary already work for presets.
- **Domain computed in `axis.ts`:** a plain function with a unit test; the chart only passes it on. Recharts' `dataMin`/`dataMax` would leave a single point on a zero-width axis.
- **Limit left alone:** the owner accepted the notice for dense 90-day ranges.

## How to verify

```sh
cd pomiary_web && pnpm exec vitest run src/dashboard
cd .. && ./scripts/.internal/e2e.sh src/dashboard
just check
```

By hand: open the dashboard with no clicks; it says "Last 90 days", and charts span only the data.
