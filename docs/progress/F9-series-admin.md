# F9 — the admin Series tab

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07). The web feature `series/`
on top of the API from F3.

## What was met

| Code | Scope |
| --- | --- |
| F2 | **The administrator's part.** Name, unit, range, colour and marker shape are entered in the form and shown in the Series tab's table (colour swatch plus code, shape drawn plus named). The dashboard's table column and chart curve are still to come. |
| F3 | **The UI side for series.** Only a logged-in administrator sees the Series tab and its create / edit / delete controls; readers cannot reach them (and the server refuses them anyway, F3). No screen edits a measurement. The sensors screen is another step. |
| F4 | **The series form's part.** Minimum below maximum, name and unit lengths, finite numbers and `#RRGGBB` are checked before sending; the server's 422 shows under its fields and a 409 (the new range would exclude stored measurements) under both range fields. |
| F9 | **The series forms' part.** A real `<form>` (Enter submits), validation before sending, the submit button disabled with a loader while sending, the server's field errors under the fields and the rest in an alert, a 401 ends the session. The sensors form is still to come. |
| T6 | **Partly.** The marker shape is an inline SVG with a text alternative (`Marker: triangle`) and its name is written next to it, so a series is not told by colour alone; every input is labelled; focus moves into the dialog and back. |

## What was done

- **`series/api.ts`:** list, create, update and delete through `request`, typed from `openapi.d.ts`.
- **`series/validation.ts` (+ `.test.ts`):** `validateSeries` (the form's rules, messages by field), `toInput` (trim, empty unit to null), `shapeOf` (unknown icon is a circle, as the design says for the chart) and `failureOf` (where a server error is shown: 401, 409, 422 field errors, other).
- **`series/SeriesAdmin.tsx`:** loads the list (abortable effect), `Loading` / `ErrorAlert` with Retry from `shell/`, the table with Edit and Delete per row (`aria-label` "Edit <name>" / "Delete <name>"), and the dialogs; the list reloads after every change.
- **`series/SeriesForm.tsx`:** one form for create and edit, in a Mantine `Modal` (focus enters on the name, returns to the opener on close).
- **`series/DeleteSeries.tsx`:** the confirmation, which says the measurements and sensors go too; errors shown in the dialog.
- **`series/MarkerIcon.tsx`:** circle, square, triangle, diamond in a 16 px SVG.
- **`App.tsx`:** the Series tab renders `SeriesAdmin`. **`knip.json`:** the ignore entries for `Loading` and `ErrorAlert` are gone, since `series/` imports them.
- **`series/series.e2e.ts`:** create (Enter submits, focus), min = max refused with no request, edit, the 409 path (a measurement stored through the API, then the range narrowed), delete with confirmation.

## Why this way

- **A 409 goes under both range fields,** because the server's sentence is about the range as a whole and the user may fix either end; it is not an alert at the top, where it would be far from the cause.
- **Validation in a plain module,** so the rules and the error mapping are unit-tested without React (AGENTS.md 5.1).
- **Stored `icon` outside the four shapes is shown as a circle** instead of an error: the server accepts any string there.
- **No form library, no extra dependency:** Mantine core has `ColorInput`, `Select`, `NumberInput`, `Modal` and `Table`.
- **Delete is a second dialog, not `window.confirm`,** so it is styled, focus-managed and testable, and can show a server error.
- **Edit/Delete buttons keep the visible text short** ("Edit") with the series name in the `aria-label`, so a screen reader hears which row it is on and the e2e finds them by that name.
- Left out: pagination and sorting of the table (a dozen series), an undo for delete.

## How to verify

```sh
cd pomiary_web
pnpm exec vitest run src/series                 # the validation rules and error mapping
pnpm exec tsc --noEmit -p tsconfig.app.json && pnpm exec eslint . && pnpm exec knip
E2E_DATABASE_NAME=pomiary_e2e_series E2E_SERVER_PORT=6251 E2E_WEB_PORT=3251 ../scripts/.internal/e2e.sh src/series
```

By hand: `just db up`, `just server`, `just web`, log in, open the Series tab, create a series with
minimum 5 and maximum 5 (the message appears under Maximum, nothing is sent), then narrow the range of a series that has measurements (the conflict shows under the range).
