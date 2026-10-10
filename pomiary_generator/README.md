# pomiary_generator: the sensor emulator

Sends measurements to the Pomiary API the way a real sensor would: `POST /api/measurements`
with the sensor's key in `X-API-Key`. It never touches the database. Standard library only:
**Python 3.12 or newer, nothing to install.**

```sh
cd pomiary_generator
python -m pomiary_generator --help
python -m pomiary_generator send --help
```

(From the repository root, `uv run python -m pomiary_generator ...` works the same.)

The API address and the key can come from the environment, so they stay out of shell history
and out of the repository: `POMIARY_API`, `POMIARY_API_KEY`, and for `seed`
`POMIARY_ADMIN_USER`, `POMIARY_ADMIN_PASSWORD`. The key is shown once, when the sensor is
registered in the admin panel (or by `seed`).

## `send`: one sensor

Two modes:

| Mode | Parameters | What it does |
| --- | --- | --- |
| Backfill | `--count N [--step 1h] [--end now]` | N values with past timestamps, `--step` apart, the newest at `--end`; sent oldest first |
| Live | `--interval 5s [--count N]` | the current value every interval, forever unless `--count`; the server stamps the time |

| Parameter | Meaning |
| --- | --- |
| `--api URL` | API base URL, e.g. `http://localhost:8092` (env `POMIARY_API`) |
| `--api-key KEY` | the sensor's key (env `POMIARY_API_KEY`); missing key is an error |
| `--count N` | number of values (backfill) or sends (live) |
| `--step 1h` | backfill: time between values; units `s`, `m`, `h`, `d` (default `1h`) |
| `--end now` | backfill: time of the newest value, ISO 8601 (`2026-10-09T10:00:00Z`) or `now` |
| `--interval 5s` | live: time between sends |
| `--source synthetic` (default) / `open-meteo` | where the values come from |
| `--shape constant\|random\|sine\|random-walk` | synthetic: default `random` |
| `--min A --max B` | synthetic: value range (defaults 0 and 100). Values never leave it |
| `--period 1m` | synthetic sine: length of one wave (default: `60s` live, so maximum to minimum takes 30 s; `24h` backfill). The phase follows the wall clock, so generators started at different times stay in step |
| `--noise X` | synthetic: standard deviation of noise added to the shape (still clamped to the range) |
| `--seed N` | synthetic: same seed, same values |
| `--place warsaw\|suwalki\|chelm` | open-meteo: place |
| `--quantity precipitation\|air-temperature\|soil-temperature\|soil-moisture` | open-meteo: quantity |
| `--dry-run` | print what would be sent; no request to the Pomiary API |

Output, one line per value:

```
201 2026-10-09T10:00:00Z 12.3
REJECTED 422: value 120 is outside the series range [0, 100]  (value 120, time 2026-10-09T10:00:00Z)
```

A rejection (400/422) prints the server's explanation (Problem Details `detail` and `errors`)
and the run continues. A 401 means the key is invalid or the sensor was unregistered: the run
stops. A network error stops a backfill and is retried at the next interval in live mode.
The exit code is non-zero when anything was rejected or failed.

### Examples

```sh
export POMIARY_API=http://localhost:8092
export POMIARY_API_KEY=...        # shown once when the sensor was registered

# Backfill: 48 hourly values ending now, a daily sine wave (sample data for a series 0..100)
python -m pomiary_generator send --count 48 --step 1h --shape sine --min 20 --max 80 --noise 2 --seed 1

# Backfill up to a given moment, every 15 minutes
python -m pomiary_generator send --count 100 --step 15m --end 2026-10-01T12:00:00Z --shape random-walk

# Live demo: a new value every 5 seconds, the sine wave has a 60 s period by default
python -m pomiary_generator send --interval 5s --shape sine --min 10 --max 30

# Real data, backfill: the last 72 hourly values of soil moisture in Suwałki
python -m pomiary_generator send --source open-meteo --place suwalki --quantity soil-moisture --count 72

# Real data, live: the latest hourly value, sent every 10 minutes
python -m pomiary_generator send --source open-meteo --place warsaw --quantity air-temperature --interval 10m

# A deliberate out-of-range value to show the rejection (F4): the series allows 0..100
python -m pomiary_generator send --count 1 --shape constant --min 120 --max 120

# See what would happen, without sending
python -m pomiary_generator send --dry-run --count 5 --shape sine --min 0 --max 10
```

### Open-Meteo

Real hourly data from [Open-Meteo](https://open-meteo.com) (forecast endpoint with
`past_days`; it reaches up to 92 days back and is current up to the present hour):

| Quantity | Open-Meteo variable | Unit |
| --- | --- | --- |
| `precipitation` | `precipitation` | mm |
| `air-temperature` | `temperature_2m` | °C |
| `soil-temperature` | `soil_temperature_6cm` | °C |
| `soil-moisture` | `soil_moisture_3_to_9cm` × 100 | % vol |

Open-Meteo values are hourly. In backfill, the last N hourly values up to `--end` are sent with
their own timestamps (`--step` does not apply, and future hours are never sent). In live mode
the latest hourly value is sent with the current time, so a short `--interval` repeats the same
value until the hour changes (the value is fetched again only then).

**Attribution:** Weather data by [Open-Meteo.com](https://open-meteo.com/), licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The free tier is for non-commercial
use, below 10 000 calls per day. The generator makes one call per `send` run with
`--source open-meteo` (plus one per hour in live mode), and `seed` makes one call per place
(three in all, each fetching all four quantities).

## `seed`: the sample data (F11)

Prepares the application through the API: logs in as the administrator, creates the 12 series
(3 places × 4 quantities, ranges as in `docs/design.md`; colour tells the place apart and the
marker `circle`/`square`/`triangle`/`diamond` the quantity) when a series of that name does not
exist, registers one sensor per series (`open-meteo/<place>/<quantity>`) and fills it with
`--days` of hourly values sent with that sensor's key.

```sh
export POMIARY_ADMIN_USER=admin POMIARY_ADMIN_PASSWORD=...
python -m pomiary_generator seed --api http://localhost:8092 --days 30
python -m pomiary_generator seed --api http://localhost:8092 --days 30 --source synthetic   # Open-Meteo is down
```

| Parameter | Meaning |
| --- | --- |
| `--api`, `--user`, `--password` | API address and administrator (envs above) |
| `--days 30` | days of hourly values per series |
| `--source open-meteo` (default) / `synthetic` | the fallback makes a daily sine wave (random for precipitation) |

The sensors' keys are printed **once**, at the end; the generator stores them nowhere. Copy
the ones you need for `send`. A series that already has measurements is skipped (and the run
says so), so running `seed` again does not duplicate anything. A full run is about 8 600
requests (30 days × 24 h × 12 series).

## Tests

```sh
cd pomiary_generator
uvx --with pytest pytest            # no network; a fake API runs in a thread
uvx --with pytest pytest -m live    # one call to the real Open-Meteo (outside the gate)
```
