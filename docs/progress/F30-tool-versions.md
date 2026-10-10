# F30 — concrete tool versions in the documentation

Date: 2026-10-11. The owner noticed that the documentation's tool table said "current" for uv, just and
podman, which is not a version.

## What was met

| Code | Scope |
| --- | --- |
| B5 | **Improved, in progress.** The specification asks the documentation for the local run's "tool versions"; section 3.1 now gives a number for every tool. The deployment TODOs remain. |

## What was done

- `docs/documentation.md` section 3.1: uv 0.12.5, just 1.58.0, podman 5.8.4 with `podman compose` running
  the docker-compose 5.5.0 provider, Node.js 24.20.0 locally (the image stays `node:24-alpine`). A sentence
  above the table says these are the versions built and tested with, and which are pinned by the repository.
- The rows already concrete (Python 3.14, pnpm 11.24.0, PostgreSQL 17.11, nginx 1.29, the generator's
  Python 3.12+) were checked against `.python-version`, `package.json`, `compose.yaml` and the generator's
  `pyproject.toml`, and kept.

## Why this way

- **Tested versions, not minimums:** nobody checked the oldest uv or just that works, so a minimum would be a
  guess. The versions on the machine that runs the gate are a fact, and the sentence says older ones may work.
- **No new pins:** pinning uv or just in the repository (a `required-version`, a CI input) would be a change
  of tooling for a documentation fix; left out.

## How to verify

```sh
uv --version; just --version; podman --version; podman compose version; node --version
sed -n '/### 3.1/,/^Stack/p' docs/documentation.md
just package --stage e2      # the PDF stays at 6 pages
```
