# F7 — live measurements over Server-Sent Events (server side)

Date: 2026-10-09. Project stage: before E1 (E1 deadline: 2026-11-07).

## What was met

| Code | Scope |
| --- | --- |
| X1 | **Server side met.** `GET /api/measurements/stream` pushes every measurement stored after the client connected. The chart that draws them comes with the dashboard, so the row stays `in progress`. |

## What was done

- **`GET /measurements/stream?series=1,3`** (public, in `measurements/api.py`): `text/event-stream`. Each new measurement is an event `measurement` whose `data` is the Measurement JSON of the API (camelCase, same shape as `GET /measurements/{id}`). `series` is optional (all series) and parsed by the same function as in `GET /measurements`, so a malformed list is a 400. A comment `: ping` goes out right after the connection is listening and then after every 15 s of quiet. The response carries `Cache-Control: no-cache` and `X-Accel-Buffering: no`, besides the usual security headers.
- **NOTIFY on store:** `add_measurement` runs `SELECT pg_notify('measurements', <Measurement JSON>)` in the transaction of the insert. PostgreSQL delivers it on commit, so a rejected (422) or rolled-back measurement is never announced.
- **LISTEN per client:** `store.listen()` is an async generator over one `psycopg.AsyncConnection` (autocommit, outside the pool) that runs `LISTEN measurements`, yields `None` for the heartbeat and the measurements of the asked series. When the client disconnects the generator is cancelled and the connection closes.
- **`MAX_STREAMS`** (setting `max_streams`, default 50): more open streams get a 503 problem with `Retry-After`.
- **`problems.py`:** the 406 check accepts `text/event-stream` on this route only (`EVENT_STREAM_PATHS`); every other route still speaks JSON only.
- **nginx** (`pomiary_web/nginx.conf.template`): `location = /api/measurements/stream` with `proxy_buffering off` and `proxy_read_timeout 1h`, otherwise the same proxy as `/api/`. Vite's dev proxy streams as it is.
- **API types:** `openapi.d.ts` regenerated.
- **Tests** (`tests/measurements/test_stream.py`): a measurement posted after connecting arrives with the JSON the API returned; the series filter excludes other series and a 422 is not announced; a quiet connection heartbeats; the route's format and headers; `Accept: text/event-stream` is not 406 on the stream and still 406 elsewhere; bad `series` is 400; the cap is 503. TestClient cannot read an endless response, so the generator is tested directly against the real PostgreSQL and the route with a finite stand-in for it.
- Also run by hand against uvicorn: `curl -N` received the headers, `: ping`, and the event for a measurement posted a moment later.

- **Through nginx, checked after integration** (`just up`, the real web image): `curl -N
  http://localhost:8092/api/measurements/stream` got `text/event-stream`, `: ping`, and the
  `event: measurement` of a value posted a second later through the same nginx, live. The
  stream location hides the server's copies of the security headers like `/api/` does (added
  when merging with F6's `security-headers.conf`), so each header arrives once.

## Why this way

- **LISTEN/NOTIFY**, not polling and not a broker: no latency or load from polling, nothing new to run, and PostgreSQL delivers the notification only on commit, which is exactly "announce what was stored". The payload is the measurement itself (about 150 bytes, the limit is 8000).
- **SSE, not WebSocket:** the data flows one way; SSE is plain HTTP, so it passes nginx and the Cloudflare tunnel unchanged, and the browser's `EventSource` reconnects by itself.
- **One connection per client** instead of one listener shared by all streams: simpler (no fan-out registry), and fine for a course app. The price is a database connection per viewer, which `max_streams` bounds.
- **The cap is checked when the stream is requested and counted when it starts:** a burst of simultaneous requests can overshoot it by a few. Left out: an exact semaphore, as nothing depends on the exact number.
- **No `MAX_STREAMS` in compose and the chart:** the default is right for both, and nothing there needs to change it.
- Left out: replay of missed events (`Last-Event-ID`). A client that reconnects loads the history with `GET /measurements` first, and the chart is only a live view.

## How to verify

```sh
cd pomiary_server && env -u VIRTUAL_ENV uv run pytest tests/measurements/test_stream.py -q
./scripts/.internal/api-types.sh --check
```

By hand, with `just db up` and `just server` running (a sensor key from `POST /sensors`):

```sh
curl -N -H 'Accept: text/event-stream' 'http://localhost:6220/measurements/stream?series=1'
# in another terminal:
curl -H "X-API-Key: $KEY" -H 'Content-Type: application/json' -d '{"value": 4}' http://localhost:6220/measurements
```

The first terminal prints `: ping` and then `event: measurement` with the new measurement.
