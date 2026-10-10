# F24 — print: every column fits the paper, a Print button

Date: 2026-10-10. Found by printing the real page with 12 series on A4.

## What was met

| Code | Scope |
| --- | --- |
| F7 | **Fixed.** The printout shows the configured charts together with the table, without controls, and now with **every series column**. Before, the last columns were cut off at the paper's edge. A "Print" button in the dashboard's top bar opens the print dialog. |
| T7 | **Kept.** Still the same view; the only differences on paper are `@media print` rules (hidden controls, a table that shares the paper's width, a smaller table font) and an `@page` size. There is no separate print view. |

## What was done

- **The bug:** the series columns' minimum width (`--table-min-width` = 5.5 rem + N × 5 rem, F20) was also applied in print. With 12 series the table was about 1050 px wide, A4 portrait prints about 720 px, so the last columns were lost.
- **The fix** (`dashboard.css`):
  - `@media print`: the table has `min-width: 0` and `width: 100%`, so all columns share the paper's width (the layout is already `table-layout: fixed`), with a 7.5 pt font, tight padding and a 4.5 rem time column. The header repeats on every page and rows are not split (kept from F8).
  - `@page { size: A4 landscape; margin: 10 mm; }`: landscape gives many columns the most room. The user can still choose portrait in the dialog; the columns then simply get narrower.
  - The charts need nothing: Recharts' `ResponsiveContainer` is `width="100%"`, so they follow the paper.
- **The Print button** (`Dashboard.tsx`): next to "Hide filters", `onClick={() => window.print()}`, class `no-print` so it is not on paper.
- **Tests** (`dashboard.e2e.ts`):
  - 12 series in print media on A4 landscape (1047×720) and portrait (718×1047): the table box has no horizontal overflow, all 12 series headers lie inside it, the page does not scroll sideways, no `button`, `a`, `input`, `select`, `textarea` or `form` is visible, and a chart and the table are visible. The test fails without the `min-width: 0` rule (checked).
  - The Print button is visible on screen, calls `window.print` (stubbed with an init script), and is hidden in print media.
  - The older "printing hides the controls" test is unchanged.

## Why this way

- Only `@media print` rules change the view, as T7 requires; no print-only markup.
- A smaller font plus shared width instead of splitting the table over several pages sideways: the printout stays one table a reader can follow. The cost is narrow columns with many series; landscape keeps that tolerable.
- No print preview or page-size setting in the app: the browser's dialog already has them (YAGNI).

## How to verify

- `just check`
- `./scripts/.internal/e2e.sh dashboard.e2e.ts -g "printing|Print button"`
- By hand: open http://localhost:8092, seed 12 series (`just generator seed` or the admin UI), press "Print": the preview is landscape and shows every series column, no buttons or filters.
