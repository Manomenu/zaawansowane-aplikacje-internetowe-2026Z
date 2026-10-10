# F20 - table columns: 13 series fit, more scroll in the box; newest series first

Date: 2026-10-10. The owner's feedback: with 13 series every column shows, from the 14th the table scrolls sideways; and new series should be the leftmost columns.

## What was met

| Code | Scope |
| --- | --- |
| F2 | **Still met.** A column per visible series; the columns now run newest series first (highest `id`), and so do the legends and the chart lines. |
| F10 | **Extended.** Up to 13 series columns plus the time column fit the table's box at 1024 px and 1280 px without scrolling; with 14 or more the columns keep a minimum width and the table scrolls inside its own box, the page never does; the time column stays in view. The phone rule (under 768 px: in-box scroll) is unchanged. |

## What was done

- **Order** (`grouping.ts` `newestFirst`): `Dashboard` sorts the visible series by `id` descending. The table, each chart's legend and the order of lines all follow it, so no second ordering exists. The filter checkboxes keep their grouping by unit and the order the server returns.
- **Width** (`table.ts`): `MAX_FIT_COLUMNS` = 13, `TIME_COLUMN_REM` = 5.5, `MIN_COLUMN_REM` = 4 and `tableMinWidthRem(count)`, which is null up to 13 and `5.5 + count * 4` rem from 14. `MeasurementTable` passes it as `--table-min-width`; `dashboard.css` uses it as the table's `min-width` (default 0, so up to 13 columns share the box).
- **Sticky time column** (`dashboard.css`): `position: sticky; left: 0` with the opaque body colour on the first `th`/`td` (static in print). A selected row repeats its highlight and its left marker on that cell, because the cell would otherwise hide them.
- **Tests:** vitest for `newestFirst` and `tableMinWidthRem`; e2e (1024 and 1280 px): 14 uniquely named series, others unchecked; 13 give no overflow, 14 overflow the box but not the page, the newest series is the first column, the oldest the last, and after `scrollLeft = 300` the time header is still at the box's left edge.

## Why this way

- **4 rem per column:** at 1024 px the box is about 945 px, so 13 columns of 64 px plus the 88 px time column fit and 14 do not. Wider screens may still fit 14 or more - the rule is a floor, not a cap.
- **The same order for legend and lines:** one sort in one place was simpler than keeping a second order for the table; the filters stay by unit because that grouping is their purpose.
- **Left out:** a hover colour on the sticky cell (it keeps the plain background while the rest of the row lightens), a configurable column width.

## How to verify

```bash
cd pomiary_web && pnpm exec vitest run src/dashboard/grouping.test.ts src/dashboard/table.test.ts
cd .. && just check && ./scripts/.internal/e2e.sh --grep "13 series fit"
```

By hand: create 14 series, open the Data tab at 1024 px - the newest is the first column, the table scrolls sideways in its box and "Time" stays put; hide one series and every column fits.
