# F10 — the Sensors tab

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07).

## What was met

| Code | Scope |
| --- | --- |
| F12 | **Met.** The administrator registers a sensor (name + series), sees the list (name, series, registered, last measurement or "never") and unregisters it after a confirmation. The key is shown once, in a dialog, and nowhere else. |
| F9 | **Partly, the sensors form is done.** A real `<form>` (Enter submits), validation before sending, a loading button, the server's field errors under the fields (422 unknown series on `seriesId`), 401 ends the session. The series form is still to come. |
| T5 | **Item 5 met in the UI too:** the key is displayed once and never again (not in the list, not after closing the dialog, not in any storage); the server stores only its SHA-256 (F4). |

## What was done

- **`sensors/`:** `api.ts` (list sensors, list series, register, unregister; types from `openapi.d.ts`), `validation.ts` and `command.ts` (+ unit tests), and the screens `Sensors` (table and state), `RegisterModal`, `KeyModal`, `UnregisterModal`. The table scrolls in its own box (`Table.ScrollContainer`) on a phone.
- **The key dialog:** the key in a read-only monospace field, Mantine's `CopyButton` ("Copied" feedback), a warning that it is shown once and the server keeps only a hash, and a ready generator command with this page's origin, the key and the series range. Closing it sets the state to `null`, so the key leaves the DOM and the memory of the page.
- **Wired into `App.tsx`** at the Sensors spot; `Loading` and `ErrorAlert` now have a user, so their `knip.json` ignore entries are gone.
- **e2e `sensors.e2e.ts`:** registration through the form with Enter, key >= 32 characters, a measurement with it accepted (201), the key absent from `page.content()` after closing and after a reload, "last measurement" filled, unregistering with confirmation, then 401 for the old key; and 360 px without sideways scroll.

## Why this way

- **The key lives only in the `Sensors` state while the dialog is open,** and the dialog's content is rendered only then (no exit animation keeps it in the DOM). No storage, no URL, no log.
- **The dialog cannot be dismissed by a stray click outside** (`closeOnClickOutside={false}`): the key cannot be shown again, so an accident would cost a re-registration.
- **Own `listSeries` call** in `sensors/api.ts` instead of importing `series/`: features stay independent (AGENTS.md section 4).
- **Unregistering by delete, with a confirmation** that names the consequences (key stops at once, measurements stay), as the server does it (F4).
- **No form library, no notifications package:** same pattern as `session/PasswordForm.tsx`.

## How to verify

```sh
cd pomiary_web && pnpm exec vitest run src/sensors
E2E_DATABASE_NAME=pomiary_e2e_sensors E2E_SERVER_PORT=6261 E2E_WEB_PORT=3261 ./scripts/.internal/e2e.sh src/sensors
```

By hand: log in, open Sensors, register a sensor, copy the generator command from the dialog and run it; close the dialog and check that the key is gone; unregister and run the command again (401).
