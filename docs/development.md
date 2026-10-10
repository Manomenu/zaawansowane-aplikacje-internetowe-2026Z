# Development

Everything technical about running, testing and changing this repository. The user-facing
introduction is the [README](../README.md); the rules every change follows are in
[AGENTS.md](../AGENTS.md).

## Requirements

`uv`, `pnpm` (via corepack), `just`, `podman` with `podman compose`; for the full gate also
`helm`, `shellcheck` and `gitleaks`. After cloning: `just sync` (Python and web dependencies
from the lockfiles, and the git hooks).

## Three ways to run it

1. **On the host, while developing:** `just db up`, `just server`, `just web` ->
   http://localhost:3220 (hot reload, proxies `/api` to the server on :6220).
2. **The container stack:** `just up` -> http://localhost:8092. The same images the cluster
   runs, wired the same way, with its own database volume.
3. **The cluster:** `deploy/chart/`, installed by Argo CD from the platform repo.

## Everyday commands

`just` lists every recipe, grouped.

```sh
just db up           # local PostgreSQL on :5453
just server          # API on :6220 (Swagger UI at /docs)
just web             # web app on :3220
just generator --help  # the sensor emulator (docs: pomiary_generator/README.md)
just seed            # DESTRUCTIVE: replace the 12 sample series on the local stack (:8092) with Open-Meteo data
just up / down       # the container stack on :8092 / stop it
just status / logs   # what runs and on which ports / follow the logs
just api-types       # regenerate pomiary_web/src/api/openapi.d.ts after changing an API model
just fmt             # autofixes: ruff, eslint, prettier
just secrets backup  # copy the local .env files into Bitwarden (owner only)
```

## Checks

```sh
just check           # the quality gate, exactly what CI runs
just e2e             # browser tests (Playwright) against a real server and an empty database
just contract-tests  # the teacher's tests (docs/spec/zai-tests.mjs) against a fresh local server
just lighthouse      # accessibility score (A5) of a running app, light and dark
just package         # the submission package: documentation.pdf and the source ZIP in .artifacts/submission/
```

What the gate contains and when each check applies: AGENTS.md, section 3.

## Where things are

| Path | Holds |
| --- | --- |
| `pomiary_server/` | the HTTP API (FastAPI, PostgreSQL, plain SQL migrations) |
| `pomiary_web/` | the web app (React, Mantine, Vite) |
| `pomiary_generator/` | the sensor emulator, [README](../pomiary_generator/README.md) |
| `deploy/chart/` | the Helm chart with the post-deploy smoke test |
| `compose.yaml` | the whole stack on a laptop |
| `docs/spec/` | the course specification, API contract and teacher's tests (read-only) |

## Documents

- [AGENTS.md](../AGENTS.md): the rules for changing the repository (layout, gate, import contracts, git).
- [design.md](design.md): the API's design decisions; [erd.md](erd.md): the database diagram.
- [requirements.md](requirements.md): the requirements matrix; [progress/](progress/): one file per finished stage.
- [documentation.md](documentation.md): the source of the graded PDF; [recording.md](recording.md) and [checklist.md](checklist.md): the video plan and the submission checklist.
- [spec/](spec/): the specification, the API contract and the teacher's test script (Polish, never edited).
