import asyncio
import json
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from pomiary_server.measurements import api, store
from pomiary_server.measurements.model import Measurement
from pomiary_server.settings import settings
from tests.measurements.test_api import Setup

WAIT = 5.0


@pytest.fixture
def setup(client: TestClient, auth: dict[str, str]) -> Setup:
    return Setup(client, auth)


async def next_measurement(stream: AsyncGenerator[Measurement | None]) -> Measurement:
    """The next measurement, skipping heartbeats; bounded, so a missing event fails the test."""
    async with asyncio.timeout(WAIT):
        while (item := await anext(stream)) is None:
            pass
    return item


def test_a_stored_measurement_arrives_as_the_api_sends_it(setup: Setup, database_url: str) -> None:
    async def run() -> None:
        stream = store.listen(database_url, None, 60)
        assert await anext(stream) is None  # listening
        posted = await asyncio.to_thread(setup.send, {"value": 2.5})
        received = await next_measurement(stream)
        await stream.aclose()
        assert json.loads(received.model_dump_json(by_alias=True)) == posted.json()

    asyncio.run(run())


def test_only_the_asked_series_arrive_and_rejected_ones_never(setup: Setup, database_url: str) -> None:
    other = Setup(setup.client, setup.auth)

    async def run() -> None:
        stream = store.listen(database_url, [setup.series_id], 60)
        assert await anext(stream) is None
        await asyncio.to_thread(other.send, {"value": 1})
        rejected = await asyncio.to_thread(setup.send, {"value": 99})  # outside -5..5
        await asyncio.to_thread(setup.send, {"value": 3})
        received = await next_measurement(stream)
        await stream.aclose()
        assert rejected.status_code == 422
        assert (received.series_id, received.value) == (setup.series_id, 3)

    asyncio.run(run())


def test_a_quiet_connection_yields_heartbeats(database_url: str) -> None:
    async def run() -> None:
        stream = store.listen(database_url, None, 0.05)
        assert await anext(stream) is None
        async with asyncio.timeout(WAIT):
            assert await anext(stream) is None
        await stream.aclose()

    asyncio.run(run())


def test_the_route_streams_events_with_the_headers_a_proxy_needs(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    measurement = Measurement(id=1, series_id=2, sensor_id=3, value=1.5, timestamp=datetime(2026, 1, 10, 10, tzinfo=UTC))

    async def listen(*_args: object) -> AsyncGenerator[Measurement | None]:
        yield None
        yield measurement

    monkeypatch.setattr(store, "listen", listen)
    response = client.get("/measurements/stream", headers={"Accept": "text/event-stream"})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["x-accel-buffering"] == "no"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.text == f": ping\n\nevent: measurement\ndata: {measurement.model_dump_json(by_alias=True)}\n\n"
    assert api.OpenStreams.count == 0


def test_other_routes_still_speak_only_json(client: TestClient) -> None:
    assert client.get("/measurements", headers={"Accept": "text/event-stream"}).status_code == 406


def test_a_bad_series_is_400(client: TestClient) -> None:
    assert client.get("/measurements/stream?series=a,b").status_code == 400


def test_too_many_streams_is_503(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "max_streams", 0)
    response = client.get("/measurements/stream")

    assert response.status_code == 503
    assert response.headers["content-type"] == "application/problem+json"
