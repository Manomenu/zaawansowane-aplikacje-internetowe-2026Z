# F28 — why these technologies, in the documentation

Date: 2026-10-10. The owner noticed that the specification's "Technologie proszę wybrać
samodzielnie… wybór i jego uzasadnienie należy opisać w dokumentacji" was only half met: the
documentation said what each technology gives, but not why it was chosen over the alternatives.

## What was met

| Code | Scope |
| --- | --- |
| B5 | Section 8 of `docs/documentation.md` now states the reason behind the whole stack, then one row per choice — T1, T2, T3, T4, T10 and T11 — each with the alternatives left out. The reason for the stack: the author's own prepared template `solid-app-tpl` (FastAPI + React + PostgreSQL with the gate, CI, Docker, compose and Helm, used before in grzyby-mcp) gave a working skeleton, tests and deployment on day one, and its tools are ones the author knows. |
| T1, T2, T4 | Already done (docs/progress/F14-requirements-review.md). This step documents why they were chosen. |

## What was done

- Rewrote section 8 of `docs/documentation.md` as an introduction plus a table:
  - **FastAPI** against Django, Express/NestJS and Spring;
  - **React + Mantine + Recharts** against a canvas chart library (SVG prints sharply and takes marker shapes);
  - **PostgreSQL** against SQLite (concurrent writers, `LISTEN/NOTIFY`), with no ORM;
  - **the own k3s cluster + Cloudflare Tunnel** against a free PaaS (which would sleep);
  - **a standard-library generator**.
- Checked the claims against the repo: `.python-version` 3.14, PostgreSQL 17 in compose and CI, and the template's lineage in grzyby-mcp's AGENTS.md.
- Rebuilt the PDF with `just package`: 6 pages, limit 8.

## Why this way

- **The template argument comes first because it is the real reason.** The specification asks for the reasoning behind the choice, and saying that the choice followed from a prepared, tested setup is honest and checkable: the template is public.
- **Alternatives per row:** "why X" only means something next to "instead of Y".

## How to verify

```sh
sed -n '/^## 8. Technologies/,/^## 9/p' docs/documentation.md
just package    # page count stays ≤ 8
```
