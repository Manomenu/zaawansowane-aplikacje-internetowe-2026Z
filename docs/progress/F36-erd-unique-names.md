# F36 — the ERD shows the unique names of series and sensors

Date: 2026-10-11. The owner asked whether series and sensor names should be unique in the ERD. They are,
in the database since `002_unique_names.sql`, but the diagram was drawn before that migration.

## What was met

| Code | Scope |
| --- | --- |
| B4 | **Corrected.** The ERD (`docs/erd.md`, `docs/erd.svg`, the PDF's section 4) matches both migrations again: `series.name` and `sensors.name` are marked `UK`, "unique ignoring case". |

## What was done

- `docs/erd.md`: both `name` columns marked `UK`; the tables' text names the indexes `series_name_unique`
  and `sensors_name_unique` on `lower(btrim(name))`; the intro names both migrations.
- `docs/erd.svg` re-rendered with mermaid-cli (`htmlLabels: false`, as in F12), and marked in
  `.gitattributes` as generated and `-diff`: its re-render rewrites the whole file in a few very long lines,
  which made the diff too big for suwgit's model; the readable change is the one in `docs/erd.md`.
- `docs/documentation.md` section 4: the schema is in both migrations; the names are unique.
- No schema change: the indexes exist since F21's migration; the server already maps their violation to 422.

## Why this way

- **The database enforces it, the app only words it:** a unique index holds even with two requests at once,
  which a check in Python before the insert would not; the server turns `UniqueViolation` on these indexes
  into a 422 on `name`. So the diagram marks it as a key of the table.

## How to verify

```sh
grep -n "UK" docs/erd.md                       # username, both names, api_key_hash
grep -c "<foreignObject" docs/erd.svg          # 0
grep -n "UNIQUE INDEX" pomiary_server/pomiary_server/migrations/002_unique_names.sql
just package --stage e2                        # look at section 4 of dokumentacja.pdf
```
