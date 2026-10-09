"""A fake Pomiary API on a local port, running in a thread."""

import json
import threading
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import override

import pytest
from pomiary_generator.jsonutil import as_dict

FIXTURES = Path(__file__).parent / "fixtures"


class FakeApi:
    """State of the fake server; `ranges` maps API key -> (series id, min, max)."""

    def __init__(self) -> None:
        self.series: list[dict[str, object]] = []
        self.sensors: dict[str, int] = {}  # api key -> series id
        self.measurements: list[dict[str, object]] = []
        self.requests: list[tuple[str, str, dict[str, str], object]] = []
        self.fixed_range: tuple[float, float] | None = None  # overrides the series range

    def problem(self, status: int, title: str, detail: str, errors: list[dict[str, str]] | None = None) -> tuple[int, object]:
        body: dict[str, object] = {"type": "about:blank", "title": title, "status": status, "detail": detail}
        if errors:
            body["errors"] = errors
        return status, body

    def handle(self, method: str, path: str, headers: dict[str, str], body: object) -> tuple[int, object]:  # noqa: PLR0911
        self.requests.append((method, path, headers, body))
        route, _, query = path.partition("?")
        payload = as_dict(body) or {}
        if (method, route) == ("POST", "/api/auth/login"):
            if payload.get("password") == "good":
                return 200, {"accessToken": "tok", "tokenType": "Bearer", "expiresIn": 3600}
            return self.problem(401, "Unauthorized", "wrong username or password")
        if (method, route) == ("POST", "/api/measurements"):
            return self.post_measurement(headers.get("X-Api-Key", ""), payload)
        if headers.get("Authorization") != "Bearer tok":
            return self.problem(401, "Unauthorized", "missing token")
        if (method, route) == ("GET", "/api/series"):
            return 200, self.series
        if (method, route) == ("POST", "/api/series"):
            created: dict[str, object] = {**payload, "id": len(self.series) + 1}
            self.series.append(created)
            return 201, created
        if (method, route) == ("POST", "/api/sensors"):
            key = f"key-{len(self.sensors) + 1:040d}"
            self.sensors[key] = int(str(payload["seriesId"]))
            return 201, {"id": len(self.sensors), "name": payload["name"], "seriesId": payload["seriesId"], "apiKey": key}
        if (method, route) == ("GET", "/api/measurements"):
            wanted = query.split("series=")[1].split("&")[0]
            return 200, [m for m in self.measurements if str(m["seriesId"]) == wanted][:1]
        return self.problem(404, "Not Found", "no such route")

    def post_measurement(self, key: str, payload: dict[str, object]) -> tuple[int, object]:
        if key not in self.sensors:
            return self.problem(401, "Unauthorized", "invalid API key")
        series = next(s for s in self.series if s["id"] == self.sensors[key])
        low, high = self.fixed_range or (float(str(series["minValue"])), float(str(series["maxValue"])))
        value = float(str(payload["value"]))
        if not low <= value <= high:
            return self.problem(
                422,
                "Unprocessable Content",
                f"value {value:g} is outside the series range [{low:g}, {high:g}]",
                [{"field": "value", "message": f"must be within [{low:g}, {high:g}]"}],
            )
        stored: dict[str, object] = {
            "id": len(self.measurements) + 1,
            "seriesId": series["id"],
            "value": value,
            "timestamp": payload.get("timestamp", "2026-10-09T12:00:00Z"),
        }
        self.measurements.append(stored)
        return 201, stored


@pytest.fixture
def fake() -> Iterator[tuple[FakeApi, str]]:
    state = FakeApi()

    class Handler(BaseHTTPRequestHandler):
        def _do(self) -> None:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b""
            body = json.loads(raw) if raw else None
            status, answer = state.handle(self.command, self.path, {k.title(): v for k, v in self.headers.items()}, body)
            data = json.dumps(answer).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/problem+json" if status >= 400 else "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        do_GET = do_POST = _do  # noqa: N815

        @override
        def log_message(self, format: str, *args: object) -> None:
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True)
    thread.start()
    yield state, f"http://127.0.0.1:{server.server_port}"
    server.shutdown()
    server.server_close()
