# F38 — the generator names itself, so Cloudflare lets it through

Date: 2026-10-12. Seeding the deployed app failed at the first request:
`POST /api/auth/login -> 403: The site owner has blocked access based on your browser's signature.`

## What was met

| Code | Scope |
| --- | --- |
| F13 | **Fixed for the deployed app.** The generator reaches the public address: it sends `User-Agent: pomiary-generator/0.1 (+<repository>)` with every request to the API and to Open-Meteo. |
| F11 | **Unblocked.** The sample data can be sent to production through the API. |

## What was done

- `pomiary_generator/pomiary_generator/client.py`: `USER_AGENT`, added to the headers of every API request.
- `pomiary_generator/pomiary_generator/openmeteo.py`: the Open-Meteo call goes through a `Request` with the same
  header.
- `pomiary_generator/tests/test_client.py`: a request carries `USER_AGENT`.

## Why this way

- **The cause:** Cloudflare's browser integrity check in front of the host refuses urllib's default
  `Python-urllib/3.x`; curl, Node's `fetch` (the teacher's tests) and an empty user agent pass. Checked with
  `curl -A`: `Python-urllib/3.14` gets 403, `pomiary-generator/1.0` gets 200.
- **Fixed in the client, not by switching the check off:** a client that names itself (with a link) is the
  polite default for any HTTP client, Open-Meteo included, and anyone running the generator against the
  public address benefits without a change to the platform's edge.

## How to verify

```sh
curl -s -o /dev/null -w "%{http_code}\n" -A "Python-urllib/3.14" https://pomiary-lasy.gugnowski.com/api/health   # 403
cd pomiary_generator && uv run pytest -q tests/test_client.py
python -m pomiary_generator seed --api https://pomiary-lasy.gugnowski.com --user … --password … --days 30
```
