# F13 — dashboard layout: readable markers, a table that fits, collapsible filters on top

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07). The owner's feedback on the running dashboard.

## What was met

| Code | Scope |
| --- | --- |
| F5 | **Still met.** The filters (presets, from/to, series checkboxes) work as before and apply immediately; they now sit in a section above the charts, expanded by default and collapsible, instead of a layout column. |
| F10 | **Met for the dashboard.** The content always has the full width; the table with 12 series fits without horizontal scrolling at 1280 px and at 1024 px; at 360 px the table scrolls inside its own box and the page never scrolls sideways. |
| T6 | **Met.** The series markers in the table header, the legend and the checkboxes are 20 px (were 14 px) with a 1.5 px outline; the chart's points are a little larger. |

## What was done

- **Markers:** `Marker.tsx` draws a 20 px icon (radius 8, stroke 1.5 in the text colour, so light colours show on light backgrounds); chart points radius 5 (selected 9).
- **Table:** `table-layout: fixed`, 12 px font, tight padding, numbers right-aligned with tabular digits (at most 2 decimals), the timestamp as date over time in a 5.5 rem column, header wraps (marker above the name). Below 768 px the table gets a minimum width (`--series-count`) and scrolls in its own box.
- **Series names:** the generator's `seed` now names series `<place>: <quantity>` (e.g. `Suwałki: Soil moisture`), and the dashboard shows `<name> (<unit>)`, the unit omitted when empty; the UI does not parse or split names. `seed` matches existing series by exact name, so series created earlier with the old `<quantity> — <place>` names are not matched and simply stay as they are (new ones are created beside them; delete the old ones in the admin UI if unwanted).
- **Filters section:** `Dashboard.tsx` is one column: filters, charts, table. The filters are in a Mantine `Collapse` (expanded by default); one button toggles it ("Hide filters" / "Show filters", `aria-expanded`, `aria-controls`). `Filters.tsx` lays the time range and presets in one row and the series fieldsets (per unit) in a wrapping flex row (`dashboard.css`); on a phone they stack. `summary.ts` builds the one-line summary ("Last 7 days · 12 of 12 series") next to the button; it prints, the button and filters are `no-print`.
- **Tests:** `summary.test.ts`; `dashboard.e2e.ts` covers the order filters, charts, table (bounding boxes), collapse and expand, 12 seeded series fitting at 1280 and 1024 px, header markers >= 16 px, 360 px, print. Generator test updated for the new name.
- **Table text:** cells wrap between words (`overflow-wrap: break-word; hyphens: auto`), not at any letter.
- **CSS:** `.dashboard-layout` (the two-column grid) was removed from `app.css`.

## Why this way

- **Top section over a floating panel:** the owner first asked for a right-edge floating panel (a Mantine `Drawer`, with a persisted open state and manual focus return), then chose the simpler layout - filters on top, expanded but collapsible, then charts, then the table (KISS). The drawer was dropped before it was committed, together with `panelState.ts` and its tests.
- **No persistence of the toggle:** expanded is the default and the choice costs one `useState`; storing it would add a module and tests for little gain (YAGNI).
- **Names fixed at the source** rather than split in the UI: one rule, no parsing that can go wrong with names an admin types.
- **Left out:** a stored toggle, a column-width setting, a horizontal-scroll toggle, migrating old-style series names (they stay as they are).

## How to verify

```bash
cd pomiary_web && pnpm exec tsc --noEmit -p tsconfig.app.json && pnpm exec tsc --noEmit -p tsconfig.node.json \
  && pnpm exec eslint . && pnpm exec prettier --check . && pnpm exec vitest run && pnpm exec knip
cd ../pomiary_generator && env -u VIRTUAL_ENV uv run pytest -q
cd .. && ./scripts/.internal/e2e.sh
```

The e2e run also writes full-page screenshots to `.artifacts/dashboard-1024.png` and `.artifacts/dashboard-1280.png`.
