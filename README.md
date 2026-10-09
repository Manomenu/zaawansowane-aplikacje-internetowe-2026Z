# pomiary — warunki w lesie

Projekt na Zaawansowane Aplikacje Internetowe (26Z): aplikacja zbierająca i pokazująca serie
pomiarów z czujników — tu opad, temperatura i wilgotność gleby przy lasach, jako historia
pomiarów dla [grzyby-mcp](https://github.com/Manomenu/grzyby-mcp). Czujniki emuluje generator
danych, który czyta Open-Meteo (Weather data by [Open-Meteo.com](https://open-meteo.com/),
CC BY 4.0) albo generuje przebieg syntetyczny i wysyła wyniki przez API.

- Adres (po wdrożeniu): https://pomiary-lasy.gugnowski.com
- Specyfikacja, kontrakt API i testy prowadzącego: [`docs/spec/`](docs/spec/)
- Stan wymagań: [`docs/wymagania.md`](docs/wymagania.md), postęp: [`docs/progress/`](docs/progress/)

## Requirements

`uv`, `pnpm` (via corepack), `just`, `podman` with `podman compose`; for the full gate also
`helm`, `shellcheck` and `gitleaks`. After cloning: `just sync` (dependencies and the git hooks).

## Everyday commands

```sh
just                 # every recipe, grouped
just db up           # local PostgreSQL on :5453
just server          # API on :6220 (Swagger at /docs)
just web             # web app on :3220, proxies /api to the server
just up              # the whole stack in containers on :8092 — no cluster needed
just check           # the quality gate, exactly what CI runs
just e2e             # browser tests against a real server and database
just secrets backup  # copy the local .env files into Bitwarden (restore on a new machine)
```

How the repo is organised and what every change must bring along: [AGENTS.md](AGENTS.md).
