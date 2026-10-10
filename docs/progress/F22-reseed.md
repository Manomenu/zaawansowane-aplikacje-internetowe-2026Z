# F22 - seed replaces the sample data

## What was met

- F11 (sample data): `seed` can be run any number of times; the 12 sample series never multiply.
- F13 (data generator): `seed` now deletes the series it owns through the API before creating them.

## What was done

- `Api.delete_series` (`DELETE /api/series/{id}`, which also removes the series' sensors and measurements).
- `run_seed` deletes every series named exactly like one of the 12 it creates (`Warsaw: Precipitation`)
  or one of the 12 legacy names (`Precipitation — Warsaw`), prints `deleted N sample series (and
  their sensors and measurements)`, then creates the 12 series and sensors and backfills as before.
  The "skip a series that already has measurements" behaviour and `has_measurements` are gone.
- `just seed *args` (group `run`) with the local compose defaults; arguments override them.
- The fake API in the tests learned `DELETE` (with unique ids and keys after deletions); new tests
  cover deleting exactly the owned names, a second run replacing the first, and a delete failure
  stopping before anything is created.
- README documents the destructive behaviour and the recipe.

## Why this way

- Only exact names are deleted, so hand-made series, `ZAI-TEST-...` and e2e data are safe.
- Deleting before creating (not updating in place) keeps the code simple and gives a clean
  backfill; the price is that sensor keys change, documented in the README.
- No `--keep-existing` flag: the old skip behaviour needed a measurements query and a second
  code path; nobody asked for it (KISS/YAGNI).
- No row in AGENTS.md section 10: it lists scripts for machines, not `just` recipes.

## How to verify

- `cd pomiary_generator && env -u VIRTUAL_ENV uv run pytest -q`
- `uvx ruff check pomiary_generator && uvx ruff format --check pomiary_generator && env -u VIRTUAL_ENV uv run pyright`
- `just --list` shows `seed`; with `just up` running, `just seed` twice leaves exactly 12 sample series.
