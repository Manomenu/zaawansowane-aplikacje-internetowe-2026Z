# F8 — the dashboard (the public Data tab)

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07).

## What was met

| Code | Scope |
| --- | --- |
| F5 | **Met.** From/to `datetime-local` inputs, presets 24 h / 7 days / 30 days (default 7 days), series checkboxes grouped by unit with an "All <unit>" toggle; a reversed range is refused with a message and no request. |
| F6 | **Met.** Clicking a table row, or Enter/Space on it, selects it (`aria-selected`); the charts draw that moment's points larger and outlined, with a vertical reference line. |
| F7 | **Met.** Under print media the filters, presets and live indicator are hidden; the charts and the table print, with the range in a line above them. |
| T7 | **Met.** Same view printed through `@media print`; the table runs over pages with its header repeated, charts are not split. |
| F2 | **Dashboard part met:** a column per series in the table, a line per series on its unit's chart, in the series' colour with the marker from `icon`. The admin form for colour/icon is the series feature's. |
| F10 | **Dashboard part met:** no sideways page scroll at 360 px; the table scrolls inside its own box; filters stack above the content below 992 px. The admin screens are still to come. |
| T6 | **Dashboard part met:** series are told apart by marker shape as well as colour (chart points, legend, table header, checkboxes); every control is labelled; each chart is a `figure` with a `figcaption` and an `img` description, the table being the accessible data. |
| X1 | **Client part met:** `live.ts` follows `GET /api/measurements/stream` (SSE event `measurement`) and appends points; the dashboard works when the endpoint is missing. The server side and an end-to-end test of the stream are still to come. |

## What was done

- **`dashboard/api.ts`:** `GET /series` and `GET /measurements?series&from&to&sort=-timestamp&limit=10000`, typed from `openapi.d.ts`.
- **Rule modules with tests:** `range.ts` (presets, `datetime-local` text, validation, the request's `from`/`to`), `grouping.ts` (units, visibility), `markers.ts` (icon to shape, polygon points), `table.ts` (rows: union of timestamps, newest first; chart points), `live.ts` (event parsing, merge into the range, `EventSource`).
- **Screens:** `Dashboard.tsx` (state and composition), `Filters.tsx`, `UnitChart.tsx` (Recharts, one chart per unit), `MeasurementTable.tsx`, `Marker.tsx` (the marker as SVG, shared by chart, legend, table and checkboxes), `useDashboardData.ts` (loading with `AbortController`, the live stream), `dashboard.css` (table box, selected row, print).
- **Shell:** `Loading` and `ErrorAlert` (with Retry) are used, so their `knip.json` ignore entries are gone. `api/client.ts` now exports `BASE`, which `live.ts` needs for the `EventSource` address.
- **Dependency:** `recharts`.
- **Browser tests:** `dashboard.e2e.ts` seeds two series (°C, mm) with sensors and measurements through the API.

- **X1 end to end, added when integrating with the server stream (F7):** the browser test
  "a measurement a sensor sends appears without reloading (live stream)" opens the dashboard,
  waits for the "Live" status, posts a value with a sensor key through the API and sees its
  row appear in the table without a reload — the server's `GET /measurements/stream`
  (docs/progress/F7-live-stream-server.md) and `dashboard/live.ts` together.

## Why this way

- **Recharts** (SVG): prints sharply, takes a custom `dot` renderer for the marker shapes and the highlight.
- **The legend is plain HTML** under each chart instead of Recharts' legend: it uses the same marker as the table and stays a real list for screen readers.
- **Measurements are loaded for all series once per range**, and unchecking only filters on the client; no request per click. The live stream also covers all series, for the same reason (not only the visible ones).
- **State in effects is tagged with its request** (a key), so a late answer is never shown and no `setState` runs synchronously in an effect.
- **A range is "live" when it came from a preset or its end is within 5 minutes of now:** it is requested without `to`, and live points have no upper bound. A fixed past range never changes.
- **`datetime-local` text is parsed strictly** (`YYYY-MM-DDTHH:mm`): `new Date("2026-10")` would otherwise pass as a valid date.
- **Stream errors are ignored** (a `console.debug`): the page is complete without them.
- Left out: a tooltip on the charts (the table is the data), zoom, a global store.

## How to verify

```sh
cd pomiary_web
pnpm exec tsc --noEmit -p tsconfig.app.json && pnpm exec tsc --noEmit -p tsconfig.node.json
pnpm exec eslint . && pnpm exec prettier --check . && pnpm exec vitest run && pnpm exec knip
cd .. && ./scripts/.internal/e2e.sh           # 5 dashboard tests among the 14
```

By hand: `just db up`, `just server`, `just web`, open http://localhost:3220, tab Data: change the preset, uncheck a series, click or Tab+Enter on a row, print preview (Ctrl+P).
