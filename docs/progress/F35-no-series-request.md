# F35 — no measurements request when there are no series

Date: 2026-10-11. With an empty database (`just server` on the development database) the server's log showed
`GET /measurements?series=&from=… 400 Bad Request` every time the Data tab loaded.

## What was met

| Code | Scope |
| --- | --- |
| F9 | **Fixed.** An empty database no longer makes the page send a request the server must refuse; the Data tab shows "There are no series yet." without a failed call behind it. |

## What was done

- `pomiary_web/src/dashboard/api.ts`: `listMeasurements` resolves to `[]` at once when the list of series is
  empty, without calling the server.
- `pomiary_web/src/dashboard/api.test.ts` (new): no `fetch` for no series; the series are sent as `1,3`.

## Why this way

- **The server is right:** the contract says a missing `series` means all series, and an empty value is a
  malformed list, so 400 stays. The page knows there is nothing to ask for, so it does not ask.
- **In `api.ts`, not in the hook:** the rule sits next to the request it guards, is tested without React,
  and the hook keeps one path for "measurements loaded". The live stream already skipped an empty list.

## How to verify

```sh
cd pomiary_web && pnpm exec vitest run src/dashboard/api.test.ts
```
By hand: `just db up`, `just server`, `just web` on an empty database, open http://localhost:3220 — the
server's log shows `GET /series` and no `GET /measurements … 400`.
