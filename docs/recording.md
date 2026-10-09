# Recording script — the E2 video (target 6:45, limit 7:00)

The specification (`docs/spec/zai-projekt-26z.pdf`, "Zawartość zgłoszenia końcowego (E2)"):
MP4 up to 100 MB, 5 to 7 minutes, the **deployed** application with the **address bar
visible**, the requirements in order (F1–F13, mobile view, print preview, two security
elements, extensions), the code **said or shown before each requirement**, and the full
sensor cycle. This file is the plan; the minutes in `docs/checklist.md` come from it and are
corrected after the take.

Language: the script is English; the voice-over is the owner's choice. Say the code aloud in
the voice-over language (for example Polish "F szóste" or "F6") **and** show it on screen: a
large text file or sticky note with the next code in a corner of the capture, or the terminal
title.

## Before recording

- **Deployed and seeded.** `https://pomiary-lasy.gugnowski.com` answers over HTTPS, the 12
  series have 30 days of hourly values (`pomiary_generator seed`), the administrator login
  works. Run `just lighthouse https://pomiary-lasy.gugnowski.com` once beforehand (A5); it is
  not part of the video.
- **Screen:** one 1920×1080 capture. Browser on the left two thirds (address bar visible the
  whole time, zoom 100 %), terminal on the right third (font 16–18 pt). Do not use browser
  full-screen mode: it hides the address bar.
- **Browser profile:** clean (no extensions, no bookmarks bar), light theme, **logged out**
  (empty `sessionStorage`). Extra tabs, ready: the CI page
  (`https://github.com/Manomenu/zaawansowane-aplikacje-internetowe-2026Z/actions/workflows/ci.yml`),
  the GitHub file `pomiary_server/pomiary_server/sensors/store.py`, and `auth/store.py`.
  Devtools closed.
- **Terminal:** in `pomiary_generator/` (or the repository root with `uv run`), with the API
  address set, so nothing secret is typed on screen:

  ```sh
  export POMIARY_API=https://pomiary-lasy.gugnowski.com
  unset POMIARY_API_KEY
  clear
  ```

  The key is pasted into the terminal from the web app's dialog during the take
  (`export POMIARY_API_KEY=<paste>`); it belongs to a throw-away sensor deleted in the same take.
- **Where the rejection log shows (F4).** The server logs every rejected measurement as a
  `WARNING` (`measurements/store.py`: "measurement rejected: sensor ..., value ..."). On the
  cluster that log is `kubectl logs`; prepare a second terminal pane (the Argo Application is
  `pomiary`, so the chart names the deployment `pomiary-server` in namespace `pomiary`):
  `kubectl --kubeconfig ~/repos/suwalski-platform/kubeconfig -n pomiary logs deploy/pomiary-server --since=2m | grep "measurement rejected"`
  (rehearse once after deployment: it must print a line after a rejection).
  Fallback if the cluster is not shown on camera: the generator's `REJECTED 422` line plus the
  response in Swagger, and one sentence that the rejection is logged (the documentation says so).
- **Rehearse once** with a stopwatch. A backfill of 24 values takes a second or two; the live
  run `--count 8 --interval 3s` takes 24 s.
- Export MP4 (H.264) and check the size (`ls -lh`, under 100 MB; 1080p at about 3 Mbit/s is
  about 150 MB per hour, so 7 minutes is about 20 MB).

## Timeline

| Start | Len | Code(s) | What is shown and said |
| --- | --- | --- | --- |
| 0:00 | 0:20 | n/a | Address bar and the app, logged out. "Pomiary, ZAI 26Z, the deployed app at pomiary-lasy.gugnowski.com, the code on GitHub." Say what comes next. |
| 0:20 | 0:15 | **F11** | Data tab: the sample data loaded by the generator. Show at least three series with well over 15 points each (all 12: 3 places × 4 quantities, 30 days hourly). |
| 0:35 | 0:15 | **F2** | One column per series in the table, one curve per series on the chart, colour **and** marker shape (a series is not told apart by colour alone, T6). |
| 0:50 | 0:15 | **F3** | Still logged out: the reader role. No admin tabs, no way to edit a result. Say: "nobody edits results in the interface". |
| 1:05 | 0:25 | **F5** | Filters: a preset (24 h), a custom From/To range, untick one series (its curve and column disappear), tick it back. |
| 1:30 | 0:15 | **F6** | Click a table row: the point is highlighted on the chart (Enter works from the keyboard too). |
| 1:45 | 0:30 | **F8**, **F9** | Log in: first a wrong password (the server's error under the form), then the right one with **Enter**, with the loading state on the button. Account tab: change the password (a validation error first, then a valid change to the same password, so the graded login stays unchanged), log out and in again. |
| 2:15 | 0:20 | **F2**, **F4** (form) | Series tab: create "Demo temperature", unit °C, range 0–100, colour and marker. First min 100 and max 0: the form refuses before sending (F4 in the form), then the valid values. The series appears. |
| 2:35 | 0:25 | **F12** | Sensors tab, "Register a sensor": name "Demo sensor", series "Demo temperature". The dialog "Sensor registered" shows the key **once**: copy it. In the terminal: `export POMIARY_API_KEY=<paste>` (the sensor is deleted at 4:25). |
| 3:00 | 0:30 | **F13**, **F1** | Terminal: the backfill command (below), 24 lines `201 ...`. Browser, Data tab, "Demo temperature" ticked, filter 24 h: the 24 points are on the chart and in the table. Say F1: a result is a number, a time and a series, and it came only from a sensor through the API. |
| 3:30 | 0:25 | **X1** | Chart visible beside the terminal. The live command: a new point appears every 3 s **without reloading the page** (SSE live stream). |
| 3:55 | 0:30 | **F4** | The out-of-range command: `REJECTED 422: value 120 is outside the series range [0, 100]`. Then the server log pane: the `measurement rejected` WARNING line. The chart is unchanged. |
| 4:25 | 0:25 | **F12** | Sensors tab: "Unregister Demo sensor", confirm; the row disappears. Terminal, the same key, the last command below: **401**, the run stops, the unregistered sensor is refused. (Old measurements stay; delete "Demo temperature" afterwards, off camera or quickly.) |
| 4:50 | 0:20 | **B2** (mobile) | Devtools device toolbar, width **360 px**: header and tabs, collapsed filters, chart and table without sideways scrolling, then the Sensors or Series tab (stacked lists). Close the toolbar. |
| 5:10 | 0:10 | **B2** (print), **F7** | Ctrl+P: the print preview shows the chart and the table and **no controls** (filters, tabs, buttons hidden). Cancel. |
| 5:20 | 0:40 | **B3** (T5) | Two elements. (a) **Sensor API keys** (T5.5): the key was shown only once in the dialog (2:35); `GET /api/sensors` returns no key (Swagger at `/api/docs`, or the Network tab); the code tab `sensors/store.py`: `create_sensor` generates `token_urlsafe(32)` and stores only `key_hash`, the SHA-256 (`api_key_hash UNIQUE`). Optional, only if rehearsed: `psql` on the production database, `SELECT name, left(api_key_hash, 16) FROM sensors;` shows hashes and no keys; otherwise show the code and `001_schema.sql` (the deployed database is in the cluster, nothing is run against it unrehearsed). (b) **Argon2id passwords and expiring opaque session tokens** (T5.1, T5.3): the code tab `auth/store.py`: `hasher`, `open_session` (`token_hash`, `expires_at`), `UNKNOWN_USER_HASH`; the login response has `expiresIn`. Say what each protects against: a stolen database copy; replay of a token. |
| 6:00 | 0:20 | **X2** | Terminal: the Open-Meteo command (below), with the key of a sensor of a series (a seeded sensor's key, or a short-lived sensor registered before the take). Lines `201 ...` with real current values. Say: "real data from Open-Meteo, CC BY 4.0, attribution in the documentation". Code: `pomiary_generator/pomiary_generator/openmeteo.py`. |
| 6:20 | 0:15 | **X3** | The GitHub Actions page: the green status of the last run on `master` (jobs `test`, `e2e`, `build`). |
| 6:35 | 0:10 | n/a | One closing sentence: address, documentation PDF and archive are in the submission; X4 is not claimed. Stop. |

Total 6:45, 15 s of reserve. If a take runs long, shorten F5 and X2 first, never the sensor
cycle (2:35–4:50).

## The full sensor cycle (all five steps are in the video)

1. register a sensor in the app: 2:35 (F12);
2. put its key into the generator: 2:35–3:00 (`POMIARY_API_KEY`);
3. send values and see them on the chart: 3:00 and 3:30 (F13, F1, X1);
4. an out-of-range value is rejected: 3:55 (F4: the generator's message and the server log);
5. unregister, and the generator's next send is refused with 401: 4:25 (F12).

## Commands to paste (in order)

```sh
export POMIARY_API=https://pomiary-lasy.gugnowski.com
export POMIARY_API_KEY=<paste the key from the dialog>

# 3:00 backfill, 24 hourly values
python -m pomiary_generator send --count 24 --step 1h --shape sine --min 20 --max 80 --noise 2 --seed 1
# 3:30 live, 8 values 3 s apart
python -m pomiary_generator send --interval 3s --count 8 --shape sine --period 1m --min 10 --max 90
# 3:55 out of range (the series allows 0..100)
python -m pomiary_generator send --count 1 --shape constant --min 120 --max 120
# 4:25 after unregistering in the app: 401
python -m pomiary_generator send --count 1 --shape constant --min 50 --max 50
# 6:00 X2, real data (POMIARY_API_KEY set to the key of a sensor of a series)
python -m pomiary_generator send --source open-meteo --place warsaw --quantity air-temperature --count 6
```

## After the take

Fill the real minutes into `docs/checklist.md`. Check that every code was said or shown
**before** its segment, that the address bar was never hidden, the length (5:00–7:00) and the
file size. Remove the "Demo temperature" series and the demo sensors from the deployed
application if they are still there.
