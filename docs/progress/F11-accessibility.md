# F11 — accessibility checked by machines

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07).

## What was met

| Code | Scope |
| --- | --- |
| T6 | **Met.** axe (WCAG 2.0, 2.1 and 2.2, levels A and AA) reports zero violations on the Data tab (charts, table, a selected row), the login dialog, and, logged in, the Series tab, the series form, the Sensors tab, the register dialog, the key dialog and the Account tab, in the light and the dark scheme, and on the Data tab at 360 px. A series is never told apart by colour alone (marker shapes, legend, table headers, from F8). Keyboard and focus: forms submit with Enter, focus moves into a dialog and back, tabs and rows work from the keyboard, a 3 px `:focus-visible` outline in both schemes (e2e of F8 to F10). |
| F10 | **Met.** The Series and Sensors tabs do not scroll sideways at 360 px (their tables scroll inside their own box); with the shell and the dashboard from F8 every screen is covered. |
| A5 | **Measured, not closed.** `just lighthouse` against the local stack: 100 in light, 100 in dark. The graded run is against the deployed app, so the row stays `in progress` until it is deployed and the script has been run against the public URL. |

## What was done

- **Contrast fix (found by a manual Lighthouse run, 96–97 before, 100 and 100 after):** Mantine's indigo shade 6 gave buttons and links 4.32:1 on white, "dimmed" text 3.3:1 (light) and 4.03:1 (dark); all need 4.5:1. `main.tsx` sets `primaryShade: { light: 7, dark: 8 }`; `app.css` sets `--mantine-color-dimmed` to gray 7 (light) and dark 1 (dark).
- **axe in the browser tests:** `@axe-core/playwright` (devDependency); `expectNoAccessibilityViolations` in `e2e/helpers.ts` (waits until dialogs finish fading in, prints every violation with its selector and reason); `src/shell/accessibility.e2e.ts` seeds one series, sensor and some measurements through the API and runs it on each screen and dialog, light and dark (`page.emulateMedia({ colorScheme })`), plus the 360 px checks.
- **Violations axe found that Lighthouse could not (it never opens a dialog), all fixed in the app:**
  1. `button-name`: the close button of every dialog had no name. The theme now gives `Modal` the default `closeButtonProps` `aria-label="Close"` (`main.tsx`).
  2. `button-name`: the colour field's eyedropper button in the series form: `eyeDropperButtonProps` with an `aria-label`.
  3. `color-contrast`: the key dialog's yellow alert title (2.68:1 in light) now uses the plain text colour; the "Copy" button was Mantine blue (4.19:1), now the theme's primary colour (teal.9 while "Copied").
- **F10:** the 360 px no-sideways-scroll check for Series and Sensors.
- **`scripts/.internal/lighthouse.sh [url]`** and `just lighthouse [url]`: Lighthouse with Playwright's Chromium, headless, light and dark; prints both scores and every failed binary audit with its elements; JSON reports in `.artifacts/lighthouse/`; exit code 1 under 90. AGENTS.md section 3 (accessibility is checked twice) and the table in section 10.

No rule was disabled and no element excluded: there were no false positives.

- **A fix after review:** the first version of `lighthouse.sh` swapped Blink's
  `preferredColorScheme` values. Checked with `matchMedia('(prefers-color-scheme: dark)')`
  in headless Chromium: `0` = dark, `1` = light. Both runs scored 100 either way, but the
  reports had each other's names. Fixed, and re-measured: light 100, dark 100.

## Why this way

- **The test sits in `shell/`**, not beside each feature: it walks screens of several features in one session, and one file keeps the list of "every screen and dialog" in one place. The features' own e2e files keep testing behaviour.
- **Fix the theme, not each call site,** for the dialogs' close buttons and the primary colour: one default covers dialogs added later.
- **Lighthouse is not a gate step:** it needs the built stack and `npx` downloads it; axe in the gate covers the same rules (Lighthouse uses axe) on more screens. Lighthouse is the A5 measure, run by hand before a submission and after deployment. Left out: a CI job for it (nothing deployed to point it at).
- **Chromium only,** like the rest of the e2e tests.

## How to verify

```sh
just e2e src/shell/accessibility        # axe on every screen and dialog, both schemes; 360 px
just up && just lighthouse              # 100 / 100 expected; just lighthouse https://<public host> after deploying
```
