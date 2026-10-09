# F3 — series

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07). Implements the series
part of `docs/design.md`; sensors and measurements follow.

## What was met

| Code | Scope |
| --- | --- |
| F2 | **The server side.** A series has a name (1–100 characters), a range (`minValue`, `maxValue`), a colour (`#RRGGBB`), an optional icon and an optional unit (up to 20 characters). The column in the table and the curve on the chart come with the web steps. |
| F3 | **Server-side authorization of series changes.** `GET /series` and `GET /series/{id}` are public; `POST`, `PUT` and `DELETE` need an administrator's Bearer token and answer 401 without one. The UI offers no editing of results; that part is still to do. |
| F4 | **The server rules for series.** `minValue` ≥ `maxValue` is 422 with the fields named, and a `PUT` whose new range would exclude a measurement already stored in the series is 409. Value-range checks of measurements, the log of rejections, the generator and the forms are other steps. |
| T3 | **Partly.** `GET/POST /series` and `GET/PUT/DELETE /series/{id}` follow `docs/spec/zai-api-26z.yaml` (201 with `Location`, 400, 401, 404, 409, 422, `application/problem+json`). Sensors and measurements are still missing. |
| T5 | **Item 4 of 5 for series:** the routes that change a series check the administrator on the server (`CurrentAdmin`). Authorization of the sensor routes and the sensor keys stored as SHA-256 come with the sensors. |

## What was done

- **`series/`** (`model.py`, `store.py`, `api.py`), included in `app.py`:
  - `SeriesInput` and `Series` (camelCase on the wire, like `auth/model.py`). Numbers are strict:
    `true` and `"5"` are rejected, and so are NaN and infinity.
  - `GET /series` (ordered by id), `GET /series/{id}`, `POST /series` (201, `Location` built from
    `public_api_prefix`), `PUT /series/{id}`, `DELETE /series/{id}` (204; the foreign keys take
    sensors and measurements along).
  - The store commits before the route returns, like `auth/store.py`.
- **Import contracts** in the root `pyproject.toml`: `series` sits between `app` and `auth`, plus
  `api → store → model` inside it.
- **Tests** `tests/series/` against the real PostgreSQL: the full CRUD with `Location` and
  camelCase, 404 problems, 422 for min = max and min > max, 400 for a missing name, bad colour,
  string and boolean numbers, NaN, 401 for a missing and a garbage token on every changing route,
  authentication before validation, 409 and 200 on range changes (measurements inserted with SQL,
  since their API does not exist yet), cascade on delete.
- `openapi.d.ts` regenerated (`just api-types`).

## Why this way

- **422 is raised in code, not in a pydantic validator.** A validator failure is a schema failure
  and the API answers those with 400; the contract wants 422 for the business rule.
- **Authentication before the body.** `CurrentAdmin` is declared before `body` in each admin
  route; FastAPI runs dependencies first, so an admin route without a token is 401 whatever the
  body is (tested with valid and invalid bodies, and with a garbage token). Syntactically broken
  JSON is still read first and gives 400, as noted in F1.
- **The 409 check reads `measurements` directly** (`SELECT min(value), max(value)`) in the series
  store. The alternative, importing a measurements module, would invert the layers
  (`measurements` sits above `series`). The series row is locked (`FOR UPDATE`) between the check
  and the update. A measurement written at the same moment by the future measurements feature is
  checked against the range by that feature; it would have to read the series in the same way.
- **An id beyond bigint is 400**, not 404: a path value that does not fit the type is a schema
  failure, and without the cap PostgreSQL would raise an error and the client would see a 500.
- **`PUT` is a full replacement**, as in the contract; an omitted `icon` or `unit` becomes null.
- Left out: pagination of the list (twelve series), partial updates, a unique series name (the
  contract does not ask for it).

## How to verify

```sh
just db up
cd pomiary_server && uv run pytest tests/series -v
just check                                   # the whole gate
./scripts/.internal/contract-tests.sh        # the teacher's tests; the series ones pass, the
                                             # rest need sensors and measurements
```

By hand (routes are served without `/api`):

```sh
curl -s localhost:6220/series                                              # public: []
curl -i -X POST localhost:6220/series -H 'Content-Type: application/json' \
     -d '{"name":"t","minValue":0,"maxValue":1,"color":"#000000"}'          # 401
curl -i -X POST localhost:6220/series -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' \
     -d '{"name":"t","minValue":1,"maxValue":1,"color":"#000000"}'          # 422
```
