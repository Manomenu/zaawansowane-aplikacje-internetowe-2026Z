# F20 — table columns: a minimum width, the rest scroll in the box; newest series first

Date: 2026-10-10. The owner's feedback on the table. The newest series should be the leftmost
columns. As many columns as reasonably fit should show, and the rest should scroll sideways.

## What was met

| Code | Scope |
| --- | --- |
| F2 | **Kept, reordered.** Still a column per series in the table, a line per series in the charts. Columns, legends and chart lines now run **newest series first** (highest `id`), so a series the admin just created is visible without scrolling. |
| F10 | **Extended.** Every series column keeps one minimum width, `SERIES_COLUMN_MIN_REM` = 5 rem (80 px). The table is at least `time column + N × minimum` wide. When the box is wider, the columns share it; when it is narrower, the table scrolls sideways inside its own box and the page never does. So the screen decides how many columns show: about 13 at 1280 px, 10 at 1024 px, 22 at 1920 px, 3 on a 360 px phone. The time column stays in view while scrolling. |

## What was done

- **Order** (`grouping.ts`): `newestFirst` sorts the visible series by `id`, highest first. `Dashboard.tsx` applies it, so the table, the legends and the chart lines share the order. The filter checkboxes stay grouped by unit in the server's order, because that grouping is their job.
- **Width:**
  - `limits.ts` holds `TIME_COLUMN_REM` = 5.5 and `SERIES_COLUMN_MIN_REM` = 5. `limits.ts` has no imports, because the browser tests compile without the app's Vite types.
  - `table.ts` adds `tableMinWidthRem(count)`. `MeasurementTable.tsx` passes its value as `--table-min-width`, and `dashboard.css` uses it as the fixed-layout table's `min-width`. The earlier separate phone rule is gone, because the same rule now covers phones.
- **Sticky time column:** it has an opaque background, and the selected row's highlight is repeated on it. It is switched off in print.
- **Tests:**
  - vitest for `newestFirst` and `tableMinWidthRem`.
  - e2e at 1024, 1280 and 1920 px with 24 uniquely named series, the others unchecked:
    - with all 24 the box overflows and the page does not, and every series header is at least the minimum wide;
    - the newest series is the first column and the oldest the last;
    - with exactly as many series as fit (`floor((box − time column) / minimum)`, measured), nothing overflows, and one more makes the box scroll;
    - after `scrollLeft = 300` the time header is still at the box's left edge.
  - The 12-series "fits" test runs at 1280 and 1920 px, where 12 columns of the minimum fit.
  - The 360 px test keeps the page from scrolling.
- **Iterations before this version:**
  - The first had a 4 rem floor only from the 14th column, so 13 always fitted.
  - The second, after the owner asked for "13 visible, the 14th scrolls", made every column 1/13 of the box with container queries.
  - The owner then dropped the fixed count in favour of a minimum width: "fit as many as fit at a reasonable width, the rest scroll". The 13-specific code (`MAX_FIT_COLUMNS`, `data-scrolls`, `cqw` widths) was removed before it was committed.

## Why this way

- **A minimum width, not a column count:** the right number of columns depends on the screen. A fixed count is either cramped on a phone or wasteful on a wide monitor. A floor gives readable columns everywhere and uses the space there is.
- **Newest first by `id`:** ids grow with creation. Names would sort alphabetically, and a timestamp field is not in the contract's `Series`.
- **5 rem:** a header like `Suwałki: Soil moisture (%)` wraps into a few short lines, and a value of up to six characters fits. 4 rem gave four- or five-line headers. 6 rem left only 11 columns at 1280 px.

## How to verify

```sh
cd pomiary_web && pnpm exec vitest run src/dashboard/grouping.test.ts src/dashboard/table.test.ts
cd .. && ./scripts/.internal/e2e.sh src/dashboard
```

By hand (`just up`, http://localhost:8092): with many series the newest is the first column, the
table scrolls sideways in its box with "Time" staying put, and narrowing the window shows fewer
columns.
