# F25 — clear messages when the server is down

Date: 2026-10-10. Found while checking F9 against the running app, with the server container
stopped and nginx still up, the way a restart or a crash looks to a user.

## What was met

| Code | Scope |
| --- | --- |
| F9 | "Errors communicating with the server" now always reach the user in words they understand. A 502/503/504 from the gateway (nginx, the tunnel) without a Problem body says "The server is not responding right now. Try again in a moment." instead of "502 Bad Gateway". The dashboard no longer says "There are no series yet." when the series simply could not be loaded. |

## What was done

- **`api/client.ts`:** `toError` keeps the server's Problem `detail` whenever there is one. Without one, a 502, 503 or 504 gets the sentence above; any other status keeps the `<status> <text>` fallback. Tests are in `api/client.test.ts`.
- **`dashboard/Filters.tsx`:** the empty-list text is shown only once the list has loaded (a new `seriesLoaded` prop from `Dashboard.tsx`). While loading, or after a failure, the dashboard's own Loading or ErrorAlert with Retry speaks.
- **Checked by hand** on the compose stack, with the server container stopped:
  - the login form shows the button's loading state, then the new sentence in its alert;
  - the dashboard shows "Something went wrong / The server is not responding right now. Try again in a moment. / Retry".

  Both were checked before and after the fix, by tracing the browser's requests with Playwright: `/api/series` → 502.

## Why this way

- **In the HTTP plumbing, not per screen:** every feature gets the same wording through `ApiError.detail`, and the forms and alerts already show it.
- **Only gateway statuses:** a 500 comes from our own server, and it answers with a Problem body, which still wins. Hiding other statuses would lose information.

## How to verify

```sh
cd pomiary_web && pnpm exec vitest run src/api/client.test.ts
just up && podman stop zaawansowane-aplikacje-internetowe-2026z-server-1
# open http://localhost:8092: the dashboard says the server is not responding; then
podman start zaawansowane-aplikacje-internetowe-2026z-server-1
```
