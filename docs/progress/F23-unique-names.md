# F23 — Unique series and sensor names

## What was met

- **T4** (constraints): a series name and a sensor name are unique, enforced by the database
  (unique indexes on `lower(btrim(name))`), not only by the code.
- **F2** (series) and **F12** (sensors): creating or renaming to a name that is taken is refused
  with a field error on `name`.
- **F9** (validation before sending, server errors): the series form and the sensor register form
  catch a taken name from the list they already loaded, put the message under the name field and
  send nothing; if the list was stale, the server's 422 lands under the same field.

## What was done

- `migrations/002_unique_names.sql`: first renames existing duplicates (the lowest id keeps its
  name, the others get ` (#<id>)`, the base cut to stay within 100 characters), then creates
  `series_name_unique` and `sensors_name_unique`.
- `series/model.py`: a shared `Name` type strips surrounding whitespace before the length check
  (so `"  a "` is stored as `"a"` and `"   "` is a 400); `SeriesInput` and `SensorInput` use it.
- `series/store.py`, `sensors/store.py`: a `UniqueViolation` on the name index is rolled back and
  raised as `Unprocessable` with `errors: [{field: "name", ...}]` ("A series with this name already
  exists" / "A sensor with this name already exists"). Another unique violation (the sensor key
  hash) is re-raised untouched.
- Web: `validateSeries(draft, otherNames)` and `validateRegistration(values, sensorNames)` compare
  trimmed and case-insensitively; the series form ignores the series being edited. `SeriesForm`
  gets `allSeries`, `RegisterModal` gets `sensorNames`. The existing `fieldErrors` mapping already
  placed a server 422 under `name`.
- Tests that created several series or sensors with the same name now use distinct names.

## Why this way

- **422, not 409.** The contract lists 400/401/415/422 for `POST /series` and `POST /sensors`; 409
  is listed only for the range conflict of `PUT /series`. A taken name is a rule of the domain
  with a field to blame, like the other 422 cases (`docs/design.md`, Errors).
- **Catch the violation instead of a SELECT first.** A check-then-insert is racy; the index is
  the single source of truth and the constraint name tells our violation from other unique ones.
- **Index on `lower(btrim(name))`, names trimmed on input.** "Temp" and " temp " are one name for
  a person. Trimming in the model keeps stored names free of edge spaces, so the index and the
  browser's check agree; `btrim` (spaces only) is enough because the model already removes every
  kind of edge whitespace.
- **Rename duplicates in the migration** rather than failing: an existing database must keep
  starting. The suffix with the id is unique by construction. Left out: collision checks of the
  new name against a third name (practically impossible, would be dead code).
- **Two small `sameName` copies** (series and sensors) instead of a shared module: features stay
  independent (AGENTS.md section 4/5); the function is one line.
- PUT to the series' own name (or another case of it) is fine: the index only conflicts with
  other rows.

## How to verify

- `cd pomiary_server && env -u VIRTUAL_ENV uv run pytest -q` — `tests/series/test_api.py` and
  `tests/sensors/test_api.py` (duplicate, case/space variants, rename, own name),
  `tests/test_db.py::test_migration_002_renames_existing_duplicates_before_the_unique_index`.
- `cd pomiary_web && pnpm test` — `series/validation.test.ts`, `sensors/validation.test.ts`.
- `./scripts/.internal/e2e.sh src/series src/sensors` — duplicate name shows the message and
  sends nothing, for the series form and the sensor register form.
- `./scripts/.internal/check.sh` — the whole gate.
