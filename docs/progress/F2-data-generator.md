# F2 — the data generator (sensor emulator)

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07).

## What was met

| Code | Scope |
| --- | --- |
| F13 | **Met in the tool, not yet proven against the real server.** `python -m pomiary_generator send` takes the API address, the sensor key, a count or an interval, and the way values are made (constant, random, sine, random walk with a range and noise, or real Open-Meteo data). It sends values with past timestamps (backfill) and current ones (live). |
| F4 (generator part) | **Met in the tool.** A rejection by the server (400/422) prints a readable line built from the Problem Details `detail` and `errors`, e.g. `REJECTED 422: value 120 is outside the series range [0, 100]`, and the run goes on; a 401 stops with a message about an invalid key or an unregistered sensor. The server's rejection and its error log are a server task. |
| F11 | **Tool met, data pending.** `seed` creates the 12 series and 12 sensors and fills them through the API. The data itself comes after the deployment, when the real server exists. |
| T11 | **Met.** The generator is in the repository (`pomiary_generator/`), always goes through `POST /api/measurements` with `X-API-Key`, and has no hard-coded key (arguments or environment only). `pomiary_generator/README.md` describes how to run it and every parameter. |
| X2 | **Partly.** Real data from Open-Meteo for three places and four quantities, in backfill and live mode, with attribution in the README. Missing: a run against the real server and a deployed data set. |

## What was done

- New package `pomiary_generator/` laid out like the server, standard library only at runtime,
  one module per concern: `timeparse` (durations, instants, backfill times), `synthetic`
  (shapes), `openmeteo` (URL, parsing, unit conversion, fetching), `client` (HTTP calls and
  Problem Details messages), `send` (the `send` logic), `seed` (the `seed` logic), `cli`.
- `send`: backfill (`--count --step --end`, oldest first) or live (`--interval [--count]`),
  `--dry-run`, one output line per value, non-zero exit code when anything was rejected or
  failed. A network error stops a backfill and is retried at the next interval in live mode.
- `seed`: logs in, creates the 12 series (name `Soil moisture — Suwałki`, unit, range from
  `docs/design.md`, a colour per place and an icon per quantity, so series are told apart by
  two channels, T6), registers one sensor per series, backfills `--days` of hourly values. It
  prints the keys once at the end and stores them nowhere. A series that already has
  measurements is skipped and the run says so. `--source synthetic` is the fallback when
  Open-Meteo is down.
- Tests (60, no network): shapes stay in range and are deterministic with a seed; duration and
  time parsing; backfill count, order and end; Open-Meteo parsing against a recorded response
  (`tests/fixtures/open_meteo_suwalki.json`), unit conversion, no future hours; the client
  and `seed` against a fake API in a thread (201, 422, 401, network error, 12 series and 12
  sensors, a second run duplicates nothing). One test marked `live` calls the real Open-Meteo
  and is left out of the default run (`addopts = ["-m", "not live"]`).

- Wired into the repo: a uv workspace member (root `pyproject.toml`), checked by the root
  `pyrightconfig.json` (strict), its tests a step of the gate (`PYTHON_PROJECTS` in
  `scripts/.internal/check.sh`), and run with `just generator <command>`.

## Why this way

- **Standard library only.** The teacher or a grader runs the tool with a plain Python, no
  `pip install`, no virtual environment. Only pytest is a development dependency. `urllib`
  is enough for four JSON calls.
- **Open-Meteo forecast endpoint with `past_days`, not the archive API.** The archive lags
  days behind, while the forecast endpoint serves the past up to the present hour; the
  mushroom model needs yesterday's rain. One request per place returns all four quantities
  (`seed` makes three calls).
- **One sensor per series.** The API key decides the series (the contract), and a key that can
  be revoked per series matches F12: unregistering one sensor stops exactly one data source.
  It also shows the real flow: register, copy the key, send.
- **Colour per place, icon per quantity** in the seed data: all 12 series differ in at least
  one visual channel, and no series is told apart by colour alone.
- **Live Open-Meteo sends the current time.** Values are hourly, so a short interval repeats
  the same value until the hour changes; the alternative (the value's own timestamp) would be
  rejected as a duplicate-looking history or collide with the backfill. This is stated in the
  help text.
- **Keys are never stored.** `seed` prints them once, like the admin panel does (F12).
- Left out: a web UI for the generator (a console tool meets T11 and is scriptable), the
  Open-Meteo archive API, retries with back-off (a live run simply tries again at the next
  interval).

## How to verify

```sh
cd pomiary_generator
uvx --with pytest pytest -q                # 60 passed, 1 deselected (the live test)
uvx --with pytest pytest -q -m live        # the real Open-Meteo, one call
cd .. && uvx ruff check pomiary_generator && uvx ruff format --check pomiary_generator
uvx pyright pomiary_generator              # strict, 0 errors
python -m pomiary_generator send --dry-run --count 3 --shape sine --min 0 --max 10 --seed 1
python -m pomiary_generator send --count 1     # clear error: no API address / no key
```

Against a running server (after the sensor endpoints exist): register a sensor for a series
0..100 in the admin panel, then
`python -m pomiary_generator send --count 1 --shape constant --min 120 --max 120` must print
`REJECTED 422: ...` and exit with code 1; `seed` must create 12 series and fill them.
