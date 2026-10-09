# Submission checklist — DRAFT

The platform's checklist form asks, for each item B1–B5 and each extension, whether it is
declared and at which minute of the recording it is visible. This draft carries the **planned**
minutes from `docs/recording.md`; confirm every row against the real recording, then copy it
to the form. "Declared" is the intention and is revisited after the take.

| Item | Declared | Minute (planned) | Where in the repository |
| --- | --- | --- | --- |
| B1 / F1 result = number + time + series, only from sensors | yes | 3:00 | `pomiary_server/pomiary_server/measurements/` (no route edits a result) |
| B1 / F2 series: range, colour/icon, column and curve | yes | 0:35, 2:15 | `pomiary_web/src/series/`, `pomiary_web/src/dashboard/` |
| B1 / F3 roles: reader and administrator | yes | 0:50 | `pomiary_server/pomiary_server/auth/api.py` (`current_admin`), `pomiary_web/src/session/` |
| B1 / F4 range validation and a log of rejections | yes | 3:55 (form: 2:15) | `measurements/store.py`, `pomiary_generator/pomiary_generator/send.py`, `pomiary_web/src/series/validation.ts` |
| B1 / F5 filtering by time range and series | yes | 1:05 | `pomiary_web/src/dashboard/range.ts`, `Filters.tsx` |
| B1 / F6 a table row highlights a chart point | yes | 1:30 | `pomiary_web/src/dashboard/` |
| B1 / F7 printing the chart with the table | yes | 5:10 | `pomiary_web/src/app.css`, `dashboard/dashboard.css` (`@media print`) |
| B1 / F8 administrator: log in, log out, change password | yes | 1:45 | `pomiary_server/pomiary_server/auth/`, `pomiary_web/src/session/` |
| B1 / F9 UX: Enter, validation, loading, errors | yes | 1:45, 2:15 | `pomiary_web/src/session/`, `series/`, `sensors/` (`validation.ts`) |
| B1 / F10 responsive from 360 px | yes | 4:50 | `pomiary_web/src/app.css`, `shell/` |
| B1 / F11 sample data (3+ series, 15+ points) | yes | 0:20 | `pomiary_generator/pomiary_generator/seed.py` |
| B1 / F12 sensors: register, one-time key, list, unregister | yes | 2:35, 4:25 | `pomiary_server/pomiary_server/sensors/`, `pomiary_web/src/sensors/` |
| B1 / F13 generator: address, key, count/interval, mode, past and current | yes | 3:00 | `pomiary_generator/` (README) |
| B2 mobile view (about 360 px) and print preview without controls | yes | 4:50 (mobile), 5:10 (print) | `pomiary_web/src/app.css`, e2e `shell/Shell.e2e.ts` |
| B3 two T5 items in the recording and the documentation | yes | 5:20 | `docs/documentation.md` section 5: (a) `sensors/store.py`, (b) `auth/store.py` |
| B4 ERD and migrations in the archive | yes | n/a (archive) | `docs/erd.svg`, `docs/erd.md`, `pomiary_server/pomiary_server/migrations/001_schema.sql` |
| B5 complete documentation (PDF, at most 8 pages) | yes, once the TODOs in sections 1 and 2 are filled | n/a (archive) | `docs/documentation.md`, built into `documentation.pdf` by `just package` |
| X1 live chart (SSE) | yes | 3:30 | `pomiary_server/pomiary_server/measurements/api.py` (stream), `pomiary_web/src/dashboard/live.ts` |
| X2 generator with real data (Open-Meteo) | yes | 6:00 | `pomiary_generator/pomiary_generator/openmeteo.py` |
| X3 own tests in CI, green | yes (link in the form) | 6:20 | `.github/workflows/ci.yml` |
| X4 time-series database | no | n/a | not done (classic PostgreSQL) |

Form fields besides the checklist: application address (and the API address, the same host),
the administrator's test account (given only in the form), the repository link, the CI link.
