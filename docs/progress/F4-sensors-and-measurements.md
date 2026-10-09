# F4 — sensors and measurements

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07).

## What was met

| Code | Scope |
| --- | --- |
| F1 | **Met.** A measurement is a number (`value`, strict and finite), a timestamp and a series. It enters only through `POST /api/measurements` with a sensor's key, and the series comes from the key, not from the body. No route modifies or deletes a measurement: PUT, PATCH and DELETE on `/measurements/{id}` answer 405. |
| F4 | **Server side met.** A value outside `[minValue, maxValue]` (bounds inclusive) and a timestamp more than 5 minutes ahead are rejected with 422 and `errors`. Nothing is stored, and the rejection is logged at WARNING with sensor, series, value and reason. The generator shows the readable message. Form validation in the UI is still to come. |
| F12 | **Server side met.** Registration returns the key once. The list and the detail never contain the key or its hash. Unregistering deletes the sensor, its key stops working at once, and its measurements stay (`sensor_id` becomes NULL). The UI is still to come. |
| T3 | **Every endpoint of the contract exists.** The teacher's tests pass locally apart from the ones listed below. |
| T5 | **Items 4 and 5 met; with F1, all five are met on the server.** Every modifying route checks the admin token (`CurrentAdmin`) or the sensor key on the server, and authentication is checked before the body. Sensor keys are `secrets.token_urlsafe(32)` (43 characters), stored only as SHA-256, and returned only by the registration. |
| A1 | **Locally: every contract test passes except the sample data (F11).** That test needs a seeded database, which comes with the next step. |
| A3 | **Locally: all 14 validation and authorization tests pass (4 of 4 points).** |

The teacher's tests (`./scripts/.internal/contract-tests.sh`, a fresh database) fail only in four places:
- the sample-data test (the database is empty);
- the three localhost cases already in `KNOWN_FAILING`: no HTTPS, no http→https redirect, and no page with a CSP on the bare API server.

## What was done

- **`sensors/`** (`model.py`, `store.py`, `api.py`), all for administrators:
  - `GET /sensors` and `GET /sensors/{id}` return `{id, name, seriesId, createdAt, lastMeasurementAt}`;
  - `POST /sensors` answers 201 with `Location` and `apiKey`, or 422 on `seriesId` for an unknown series;
  - `DELETE /sensors/{id}` answers 204, or 404.
  - `sensor_for_key()` finds the sensor by the SHA-256 of a raw key.
- **`measurements/`**:
  - `POST /measurements` takes only `X-API-Key`; an admin's Bearer token alone is 401. The key is checked before the body. A missing `timestamp` means server time. The series' bounds are read `FOR SHARE`, so a concurrent range change (`FOR UPDATE` in series, see F3) cannot slip between the check and the insert. On success it answers 201 with `Location` and updates `sensors.last_measurement_at`.
  - `GET /measurements?series=&from=&to=&sort=&limit=` is public and uses a closed interval. Malformed `series`, `from`, `to`, `sort` or `limit` gives 400. A timestamp without a zone offset is refused (400 in the query, 400 in the body) rather than guessed.
  - `GET /measurements/{id}` returns the measurement, or 404.
- **Import layers:** `app → measurements → sensors → series → auth → problems → db → settings`, plus `api → store → model` inside both features.
- **Tests:** 134 server tests against the real PostgreSQL, among them:
  - sensors: CRUD, key length, key and hash absent from responses, 401 on all four routes without a token;
  - measurements: boundaries, the 422 cases with the WARNING log (caplog), +4 min accepted and +1 h refused, the 401 cases, a key that stops working after unregistering, the filters, sorting and limit, the 400 cases, 405 and 415.
- **The generator against a real local server** (fresh database, the Vite proxy on :3220):
  - `seed --days 2 --source synthetic` created 12 series and 12 sensors and sent 576 values with 0 problems;
  - an out-of-range `send` printed `REJECTED 422: The value must be between 0 and 100 (value 150, …)`, and the server logged `WARNING: measurement rejected: sensor 5, series 5, value 150: …`;
  - an unknown key printed `ERROR 401: the API key is invalid or the sensor was unregistered`;
  - `--source open-meteo --place suwalki --quantity air-temperature` sent 3 real hourly values.
- One fix after an interrupted session: the dataclass `Query` in `measurements/model.py` shadowed `fastapi.Query` in `api.py` and broke importing the app. It was renamed to `MeasurementQuery`.

## Why this way

- **Deleting the sensor row on unregistration** instead of a `deleted_at` flag. The spec only asks that the key stop working and the measurements stay, and `ON DELETE SET NULL` gives both with no extra state to check on every request.
- **The range check in code, not as a CHECK constraint:** the bounds live in another table, and the 422 must carry a readable message. The row lock makes it as strict as a constraint.
- **Offsetless timestamps refused, not taken as UTC:** a guessed zone stores a wrong instant without anyone noticing, while a 400 tells the sensor at once.
- **No index on `measured_at` alone:** every query of the UI and of the tests filters by series, which `(series_id, measured_at)` serves. One will be added when a query without a series filter shows up as slow.

## How to verify

```sh
just check                                   # the gate: pytest pomiary_server includes tests/sensors and tests/measurements
./scripts/.internal/contract-tests.sh        # the teacher's tests on a fresh local database
```

End to end with the generator (a fresh database):

```sh
just db up
DATABASE_URL=postgresql://pomiary:pomiary@localhost:5453/<fresh db> ADMIN_USERNAME=admin ADMIN_PASSWORD=<pw> just server
just web                                     # :3220 proxies /api to the server
just generator seed --api http://localhost:3220 --user admin --password <pw> --days 2 --source synthetic
just generator send --api http://localhost:3220 --api-key <a printed key> --count 1 --source synthetic --shape constant --min 150 --max 150
```
