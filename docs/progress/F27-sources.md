# F27 — sources of code taken from outside, in the documentation

Date: 2026-10-10. Found while re-reading the whole specification against the app: "Zasady
realizacji / Samodzielność" allows documentation, tutorials and libraries **provided the sources
of borrowed code are named**, and the code is compared automatically for similarity.

## What was met

| Code | Scope |
| --- | --- |
| B5 | The documentation now names its sources, in section 7.1 of `docs/documentation.md` next to the AI declaration:<br>- the repository skeleton from the author's own public template `solid-app-tpl`;<br>- every runtime and test library with its licence;<br>- the two documentation patterns followed: FastAPI's custom Swagger UI page and psycopg's `LISTEN`/`NOTIFY`;<br>- the Open-Meteo data (CC BY 4.0);<br>- the tools that render the ERD and the PDF;<br>- the teacher's contract and test script. |

## What was done

- Added section 7.1 "Sources of code taken from outside" to `docs/documentation.md`. Each source has a line saying what it is used for.
- Checked the licences: MIT for FastAPI, Pydantic, argon2-cffi, React, Mantine, Recharts, pytest and Vitest; BSD for Uvicorn; LGPL-3.0 for psycopg; Apache-2.0 for Playwright; MPL-2.0 for axe-core.
- Rebuilt the PDF with `just package`; it is still within the 8-page limit.

## Why this way

- **Name the template too.** It is the author's own work, but it was not written for this project. Naming it explains why the gate and the deployment files look like those of the author's other public repositories, which matters when a similarity check flags them.
- **Name patterns as well as libraries.** The Swagger page and the notification listener follow documented recipes, and saying so costs one line each.

## How to verify

```sh
grep -n "7.1 Sources" docs/documentation.md
just package        # prints the PDF's page count (limit 8)
```
