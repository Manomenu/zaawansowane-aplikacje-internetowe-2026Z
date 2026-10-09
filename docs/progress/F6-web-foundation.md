# F6 — the web app's foundation

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07).

## What was met

| Code | Scope |
| --- | --- |
| F8 | **Met.** The administrator logs in (header, dialog), logs out and changes the password (Account tab) in the UI, against the API's `/auth/login`, `/auth/logout` and `/auth/password`. Proven in the browser by `src/session/session.e2e.ts`. |
| F9 | **Partly.** Forms are real `<form>`s (Enter submits), validate before sending, disable the button and show a loader while sending, and show the server's errors (403 under the field, 401 at login as an alert, a network failure in words). The shared `Loading` and `ErrorAlert` are ready for the screens that load data. The series and sensors forms are still to come. |
| F10 | **Partly.** The page frame is responsive from 360 px (e2e: no sideways scroll, logged in). The dashboard's own layout is still to come. |
| T2 | **Partly met, structure in place.** A React SPA; the page grid is CSS Grid and `src/app.css` has `@media` rules (min-width 768 / 992 px and print). |
| T6 | **Partly.** Landmarks (`header`, `nav`, `main`, `footer`), one `h1`, every input labelled, visible focus outline, keyboard-operable tabs, `aria-live` for the session notice. The charts and the table (not by colour alone) are still to come. |
| T7 | **Partly.** `@media print` hides everything marked `no-print` (header, tabs, footer), drops the background and uses the full width; e2e checks it. The printed dashboard is still to come. |
| A4 | **Page headers met in nginx:** `Content-Security-Policy`, `X-Content-Type-Options` and `Referrer-Policy` on every response of the web container. HTTPS comes with the deployment (T10). |

## What was done

- **`api/client.ts`:** `request<T>(path, {method, body, token, signal})`; `ApiError {status, detail, fieldErrors}` built from the Problem's `detail` and `errors` (first message per field); a network failure is an `ApiError` with status 0; an aborted request is rethrown untouched. `client.test.ts` covers all of it.
- **`session/`:** `storage.ts` (the session `{token, username}` in `sessionStorage`, parsed defensively), `validation.ts`, `api.ts`, `useSession.ts` (the page's session and its notice; `onUnauthorized` is the one path for a 401), `LoginForm`, `LoginModal`, `PasswordForm`. Unit tests for storage parsing and validation.
- **`shell/`:** `Shell` (header with the h1 and "Log in" / "Logged in as … Log out", `nav` with Mantine Tabs, `main`, footer with the Open-Meteo attribution and the note that measurements come only from sensors), `TabPanel`, `Notice` (`aria-live`), `Loading`, `ErrorAlert` (with Retry).
- **`App.tsx`:** composes it. Data, Series and Sensors are placeholders with a `FEATURE SPOT` comment each; Account is the password form.
- **`app.css`:** page grid, `.dashboard-layout` (filters beside the content from 992 px), focus outline, print rules. `index.html`: `lang="en"`, title, description.
- **nginx:** `security-headers.conf` included at the server level and in every location that has its own `add_header` (nginx drops the inherited ones there); the API's own copies of the three headers are hidden in `/api/` so each is sent once. The Dockerfile copies the snippet.
- **e2e:** ports and database overridable (`E2E_SERVER_PORT`, `E2E_WEB_PORT`, `E2E_DATABASE_URL`, `E2E_DATABASE_NAME`), the server starts with `e2e-admin`; `e2e/helpers.ts` has `logIn`.
- **Removed:** the template's `health/` feature (its badge, status logic and tests) and the AGENTS.md sentences that pointed at it.

## Why this way

- **`shell/` as an element of its own in the eslint boundaries,** which every feature may import. The features stay independent of each other; `Loading` and `ErrorAlert` are the one thing all of them share, and `api/` is HTTP plumbing, not a place for components. The shell knows no feature (the header gets the user name and the callbacks as props), so the layering stays one-way.
- **`health/` removed, not moved to the footer:** nothing used it, and the real health check is the chart's smoke test. Less to maintain (KISS).
- **No notifications package:** the session notice is an `Alert` in a live region; a dependency arrives with a need it cannot serve.
- **Plain `useState` forms, no form library:** four small forms; a library arrives with a feature that needs it.
- **Opaque token and the user name in `sessionStorage`,** as the design says: it survives a reload, not a closed tab, and a 401 clears it.
- **One `add_header` snippet** rather than headers repeated in each location, so a header changed once is changed everywhere.
- **Tabs mount only the active panel** (`keepMounted={false}`), so a hidden feature does not fetch.
- `knip.json` ignores `Loading` and `ErrorAlert` until the first feature imports them (reason in the file).

## How to verify

```sh
just fmt && just check            # the whole gate
just e2e                          # 9 browser tests: login/logout, wrong password, password change, expired token, 360 px, print
E2E_DATABASE_NAME=pomiary_e2e_b E2E_SERVER_PORT=6231 E2E_WEB_PORT=3231 ./scripts/.internal/e2e.sh   # a second run beside the first
just up && curl -sI http://localhost:8092/ && curl -sI http://localhost:8092/api/health; just down
```

The two `curl`s show `Content-Security-Policy`, `X-Content-Type-Options` and `Referrer-Policy` once each. By hand: `just db up`, `just server`, `just web`, open http://localhost:3220 and log in with the administrator from `.env`.
