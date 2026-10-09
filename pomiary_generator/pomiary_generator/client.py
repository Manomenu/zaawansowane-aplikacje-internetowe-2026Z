"""A small HTTP client for the Pomiary API (standard library only)."""

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from pomiary_generator.jsonutil import as_dict, as_list
from pomiary_generator.timeparse import format_instant

TIMEOUT_SECONDS = 15

Kind = Literal["ok", "rejected", "unauthorized", "network", "failed"]


class ApiError(Exception):
    """An administrator call failed; the message is meant to be shown to the user."""


@dataclass(frozen=True)
class Reply:
    status: int | None  # None = no HTTP answer (network error)
    body: object
    network_error: str | None = None


@dataclass(frozen=True)
class Outcome:
    kind: Kind
    status: int | None
    message: str
    timestamp: str | None = None  # as stored by the server


def _request(method: str, url: str, headers: dict[str, str], payload: object | None = None) -> Reply:
    data = None if payload is None else json.dumps(payload).encode()
    all_headers = {"Accept": "application/json", **headers}
    if data is not None:
        all_headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=all_headers, method=method)  # noqa: S310  (http/https from the CLI)
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:  # noqa: S310
            return Reply(response.status, _decode(response.read()))
    except urllib.error.HTTPError as error:
        return Reply(error.code, _decode(error.read()))
    except (urllib.error.URLError, OSError) as error:
        return Reply(None, None, str(getattr(error, "reason", error)))


def _decode(raw: bytes) -> object:
    try:
        return json.loads(raw) if raw else None
    except ValueError:
        return None


def problem_message(status: int, body: object) -> str:
    """Readable text from a Problem Details body: `detail`, then the per-field `errors`."""
    fields = as_dict(body)
    if fields is None:
        return f"HTTP {status}"
    parts: list[str] = []
    detail = fields.get("detail") or fields.get("title")
    if isinstance(detail, str) and detail:
        parts.append(detail)
    for item in as_list(fields.get("errors")) or []:
        entry = as_dict(item)
        if entry is not None:
            message = str(entry.get("message", ""))
            if not any(message in part for part in parts):  # detail often repeats the message
                parts.append(f"{entry.get('field', '?')}: {message}")
    return "; ".join(parts) or f"HTTP {status}"


class Api:
    def __init__(self, base_url: str) -> None:
        self.base = base_url.rstrip("/")

    # --- the sensor's call -------------------------------------------------

    def send_measurement(self, api_key: str, value: float, moment: datetime | None) -> Outcome:
        payload: dict[str, object] = {"value": value}
        if moment is not None:
            payload["timestamp"] = format_instant(moment)
        reply = _request("POST", f"{self.base}/api/measurements", {"X-API-Key": api_key}, payload)
        if reply.status is None:
            return Outcome("network", None, f"network error: {reply.network_error}")
        if reply.status == 201:
            stored = (as_dict(reply.body) or {}).get("timestamp")
            return Outcome("ok", 201, "stored", stored if isinstance(stored, str) else None)
        message = problem_message(reply.status, reply.body)
        if reply.status == 401:
            return Outcome("unauthorized", 401, "the API key is invalid or the sensor was unregistered (" + message + ")")
        if reply.status in (400, 422):
            return Outcome("rejected", reply.status, message)
        return Outcome("failed", reply.status, message)

    # --- administrator calls (seed) ---------------------------------------

    def _admin(self, method: str, path: str, token: str | None, payload: object | None = None, query: str = "") -> object:
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        reply = _request(method, f"{self.base}{path}{query}", headers, payload)
        if reply.status is None:
            msg = f"network error: {reply.network_error}"
            raise ApiError(msg)
        if reply.status >= 400:
            msg = f"{method} {path} -> {reply.status}: {problem_message(reply.status, reply.body)}"
            raise ApiError(msg)
        return reply.body

    def login(self, username: str, password: str) -> str:
        body = self._admin("POST", "/api/auth/login", None, {"username": username, "password": password})
        token = (as_dict(body) or {}).get("accessToken")
        if not isinstance(token, str):
            msg = "login answered without accessToken"
            raise ApiError(msg)
        return token

    def list_series(self, token: str) -> list[dict[str, object]]:
        body = self._admin("GET", "/api/series", token)
        return [d for d in (as_dict(s) for s in as_list(body) or []) if d is not None]

    def create_series(self, token: str, series: dict[str, object]) -> dict[str, object]:
        body = self._admin("POST", "/api/series", token, series)
        created = as_dict(body)
        if created is None:
            msg = "series creation answered without a body"
            raise ApiError(msg)
        return created

    def create_sensor(self, token: str, name: str, series_id: object) -> str:
        body = self._admin("POST", "/api/sensors", token, {"name": name, "seriesId": series_id})
        key = (as_dict(body) or {}).get("apiKey")
        if not isinstance(key, str):
            msg = "sensor registration answered without apiKey"
            raise ApiError(msg)
        return key

    def has_measurements(self, token: str, series_id: object) -> bool:
        body = self._admin("GET", "/api/measurements", token, query=f"?series={series_id}&limit=1")
        return bool(as_list(body))
