import logging
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from psycopg import Connection

SERIES = {"name": "Air temperature", "minValue": -5, "maxValue": 5, "color": "#1f77b4"}
T0, T1, T2 = "2026-01-10T10:00:00Z", "2026-01-10T11:00:00Z", "2026-01-10T12:00:00Z"


class Setup:
    """A series with one sensor."""

    def __init__(self, client: TestClient, auth: dict[str, str], **over: Any) -> None:
        self.client = client
        self.auth = auth
        self.series_id: int = client.post("/series", json={**SERIES, **over}, headers=auth).json()["id"]
        sensor = client.post("/sensors", json={"name": "s", "seriesId": self.series_id}, headers=auth).json()
        self.sensor_id: int = sensor["id"]
        self.key: str = sensor["apiKey"]

    def send(self, body: Any, key: str | None = None) -> Any:
        return self.client.post("/measurements", json=body, headers={"X-API-Key": key or self.key})

    def stored(self) -> list[dict[str, Any]]:
        return self.client.get(f"/measurements?series={self.series_id}&limit=10000").json()


@pytest.fixture
def setup(client: TestClient, auth: dict[str, str]) -> Setup:
    return Setup(client, auth)


def instant(text: str) -> datetime:
    return datetime.fromisoformat(text)


def test_post_returns_201_with_location_and_fields(setup: Setup) -> None:
    response = setup.send({"value": 1.5, "timestamp": T1})

    assert response.status_code == 201
    body = response.json()
    assert response.headers["location"] == f"/api/measurements/{body['id']}"
    assert body["value"] == 1.5
    assert body["seriesId"] == setup.series_id
    assert body["sensorId"] == setup.sensor_id
    assert instant(body["timestamp"]) == instant(T1)
    assert setup.client.get(f"/measurements/{body['id']}").json() == body


def test_an_offset_timestamp_is_the_same_instant(setup: Setup) -> None:
    body = setup.send({"value": 1, "timestamp": "2026-01-10T12:00:00+02:00"}).json()

    assert instant(body["timestamp"]) == instant(T0)


def test_no_timestamp_means_now(setup: Setup) -> None:
    body = setup.send({"value": 1}).json()

    assert abs(instant(body["timestamp"]) - datetime.now(UTC)) < timedelta(seconds=30)


def test_the_sensor_remembers_its_last_measurement(setup: Setup) -> None:
    assert setup.client.get(f"/sensors/{setup.sensor_id}", headers=setup.auth).json()["lastMeasurementAt"] is None

    setup.send({"value": 1})

    last = setup.client.get(f"/sensors/{setup.sensor_id}", headers=setup.auth).json()["lastMeasurementAt"]
    assert abs(instant(last) - datetime.now(UTC)) < timedelta(seconds=30)


def test_the_bounds_are_inclusive(setup: Setup) -> None:
    assert setup.send({"value": -5, "timestamp": T0}).status_code == 201
    assert setup.send({"value": 5, "timestamp": T1}).status_code == 201
    assert [m["value"] for m in setup.stored()] == [-5, 5]


@pytest.mark.parametrize("value", [5.01, -5.01, 1e300])
def test_out_of_range_is_422_not_stored_and_logged(setup: Setup, caplog: pytest.LogCaptureFixture, value: float) -> None:
    with caplog.at_level(logging.WARNING):
        response = setup.send({"value": value, "timestamp": T0})

    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["errors"][0]["field"] == "value"
    assert setup.stored() == []
    warnings = [record.getMessage() for record in caplog.records if record.levelno == logging.WARNING]
    assert any(f"sensor {setup.sensor_id}" in text and f"series {setup.series_id}" in text for text in warnings)


def test_a_time_too_far_ahead_is_422_and_logged(setup: Setup, caplog: pytest.LogCaptureFixture) -> None:
    future = (datetime.now(UTC) + timedelta(hours=1)).isoformat()

    with caplog.at_level(logging.WARNING):
        response = setup.send({"value": 1, "timestamp": future})

    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "timestamp"
    assert setup.stored() == []
    assert "rejected" in caplog.text


def test_four_minutes_ahead_is_accepted(setup: Setup) -> None:
    assert setup.send({"value": 1, "timestamp": (datetime.now(UTC) + timedelta(minutes=4)).isoformat()}).status_code == 201


@pytest.mark.parametrize(
    "body",
    [
        {"value": "abc"},
        {"value": "1"},
        {"value": True},
        {"value": None},
        {},
        {"value": 1, "timestamp": "wczoraj"},
        {"value": 1, "timestamp": "2026-01-10T10:00:00"},
        {"value": 1, "timestamp": 1700000000},
        {"value": 1, "timestamp": ""},
    ],
)
def test_bad_bodies_are_400(setup: Setup, body: dict[str, Any]) -> None:
    response = setup.send(body)

    assert response.status_code == 400
    assert setup.stored() == []


def test_broken_json_and_nan_are_400(setup: Setup) -> None:
    headers = {"X-API-Key": setup.key, "Content-Type": "application/json"}

    assert setup.client.post("/measurements", content='{"value":', headers=headers).status_code == 400
    assert setup.client.post("/measurements", content='{"value": NaN}', headers=headers).status_code == 400


def test_text_plain_is_415(setup: Setup) -> None:
    response = setup.client.post("/measurements", content="value=1", headers={"X-API-Key": setup.key, "Content-Type": "text/plain"})

    assert response.status_code == 415


def test_the_key_is_required_and_a_bearer_token_is_not_enough(setup: Setup) -> None:
    body = {"value": 1}

    assert setup.client.post("/measurements", json=body).status_code == 401
    assert setup.send(body, key="x" * 40).status_code == 401
    assert setup.client.post("/measurements", json=body, headers=setup.auth).status_code == 401
    assert setup.client.post("/measurements", json=body, headers={**setup.auth, "X-API-Key": ""}).status_code == 401
    response = setup.client.post("/measurements", json=body)
    assert response.headers["content-type"] == "application/problem+json"
    assert setup.stored() == []


def test_the_key_is_checked_before_the_body(setup: Setup) -> None:
    assert setup.send({"value": "abc"}, key="x" * 40).status_code == 401
    assert setup.client.post("/measurements", json={}).status_code == 401


def test_an_unregistered_sensor_cannot_send_but_its_measurements_stay(setup: Setup) -> None:
    measurement = setup.send({"value": 1, "timestamp": T0}).json()

    assert setup.client.delete(f"/sensors/{setup.sensor_id}", headers=setup.auth).status_code == 204

    assert setup.send({"value": 2}).status_code == 401
    kept = setup.client.get(f"/measurements/{measurement['id']}")
    assert kept.status_code == 200
    assert kept.json()["sensorId"] is None


def test_deleting_the_series_deletes_its_measurements(setup: Setup) -> None:
    measurement = setup.send({"value": 1}).json()

    assert setup.client.delete(f"/series/{setup.series_id}", headers=setup.auth).status_code == 204

    assert setup.client.get(f"/measurements/{measurement['id']}").status_code == 404
    assert setup.send({"value": 1}).status_code == 401


def test_a_series_range_change_that_excludes_stored_values_is_still_409(setup: Setup) -> None:
    setup.send({"value": 5})

    response = setup.client.put(f"/series/{setup.series_id}", json={**SERIES, "minValue": 0, "maxValue": 4}, headers=setup.auth)

    assert response.status_code == 409


def test_get_one_404_and_huge_id(setup: Setup) -> None:
    assert setup.client.get("/measurements/999").status_code == 404
    assert setup.client.get(f"/measurements/{2**63}").status_code == 400


@pytest.mark.parametrize("method", ["PUT", "PATCH", "DELETE"])
def test_measurements_cannot_be_changed_or_deleted(setup: Setup, method: str) -> None:
    measurement = setup.send({"value": 1}).json()

    response = setup.client.request(method, f"/measurements/{measurement['id']}", json={"value": 2}, headers=setup.auth)

    assert response.status_code == 405
    assert response.headers["content-type"] == "application/problem+json"
    assert setup.client.get(f"/measurements/{measurement['id']}").json()["value"] == 1


def test_list_sorts_ascending_by_default_and_descending_on_request(setup: Setup) -> None:
    for value, stamp in ((2, T2), (0, T0), (1, T1)):
        setup.send({"value": value, "timestamp": stamp})

    ascending = setup.client.get(f"/measurements?series={setup.series_id}").json()
    descending = setup.client.get(f"/measurements?series={setup.series_id}&sort=-timestamp").json()

    assert [m["value"] for m in ascending] == [0, 1, 2]
    assert [m["value"] for m in descending] == [2, 1, 0]


def test_from_and_to_are_a_closed_interval(setup: Setup) -> None:
    for value, stamp in ((0, T0), (1, T1), (2, T2)):
        setup.send({"value": value, "timestamp": stamp})

    both = setup.client.get(f"/measurements?series={setup.series_id}", params={"from": T0, "to": T1}).json()
    only_from = setup.client.get(f"/measurements?series={setup.series_id}", params={"from": T1}).json()
    only_to = setup.client.get(f"/measurements?series={setup.series_id}", params={"to": T0}).json()
    offset = setup.client.get(f"/measurements?series={setup.series_id}", params={"from": "2026-01-10T13:00:00+02:00"}).json()

    assert [m["value"] for m in both] == [0, 1]
    assert [m["value"] for m in only_from] == [1, 2]
    assert [m["value"] for m in only_to] == [0]
    assert [m["value"] for m in offset] == [1, 2]


def test_series_filter_takes_a_list_and_no_filter_means_all(client: TestClient, auth: dict[str, str]) -> None:
    first, second, third = (Setup(client, auth) for _ in range(3))
    for each in (first, second, third):
        each.send({"value": 1})

    both = client.get(f"/measurements?series={first.series_id},{third.series_id}").json()
    everything = client.get("/measurements").json()

    assert {m["seriesId"] for m in both} == {first.series_id, third.series_id}
    assert len(everything) == 3
    assert client.get("/measurements?series=999999").json() == []


def test_limit_applies_after_sorting(setup: Setup) -> None:
    for value, stamp in ((0, T0), (1, T1), (2, T2)):
        setup.send({"value": value, "timestamp": stamp})

    newest = setup.client.get(f"/measurements?series={setup.series_id}&sort=-timestamp&limit=1").json()

    assert [m["value"] for m in newest] == [2]


@pytest.mark.parametrize(
    "query",
    [
        "from=nie-data",
        "to=nie-data",
        "from=2026-01-10T10:00:00",
        "from=2026-01-10",
        "from=1700000000",
        "series=a",
        "series=1,,2",
        "series=",
        "series=-1",
        "series=0",
        f"series={2**63}",
        "sort=value",
        "sort=-",
        "limit=0",
        "limit=10001",
        "limit=abc",
    ],
)
def test_bad_queries_are_400_problems(client: TestClient, conn: Connection, query: str) -> None:
    response = client.get(f"/measurements?{query}")

    assert response.status_code == 400
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["status"] == 400


def test_the_maximum_limit_is_accepted(client: TestClient, conn: Connection) -> None:
    assert client.get("/measurements?limit=10000").status_code == 200
