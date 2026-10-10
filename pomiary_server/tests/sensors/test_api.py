from typing import Any

from fastapi.testclient import TestClient
from psycopg import Connection

SERIES = {"name": "Air temperature", "minValue": -40, "maxValue": 45, "color": "#1f77b4"}


def make_series(client: TestClient, auth: dict[str, str]) -> int:
    return int(client.post("/series", json=SERIES, headers=auth).json()["id"])


def register(client: TestClient, auth: dict[str, str], series_id: int, name: str = "Warsaw station") -> dict[str, Any]:
    response = client.post("/sensors", json={"name": name, "seriesId": series_id}, headers=auth)
    assert response.status_code == 201
    return response.json()


def test_create_returns_201_with_location_and_a_long_key(client: TestClient, auth: dict[str, str]) -> None:
    series_id = make_series(client, auth)

    response = client.post("/sensors", json={"name": "Warsaw station", "seriesId": series_id}, headers=auth)

    assert response.status_code == 201
    body = response.json()
    assert response.headers["location"] == f"/api/sensors/{body['id']}"
    assert body["name"] == "Warsaw station"
    assert body["seriesId"] == series_id
    assert body["lastMeasurementAt"] is None
    assert body["createdAt"]
    assert len(body["apiKey"]) >= 32


def test_keys_are_different_and_only_their_hash_is_stored(client: TestClient, auth: dict[str, str], conn: Connection) -> None:
    series_id = make_series(client, auth)
    first, second = register(client, auth, series_id, "one"), register(client, auth, series_id, "two")

    assert first["apiKey"] != second["apiKey"]
    stored = [row[0] for row in conn.execute("SELECT api_key_hash FROM sensors").fetchall()]
    assert len(stored) == 2
    assert all(len(value) == 64 and first["apiKey"] not in value for value in stored)


def test_get_never_shows_the_key_or_its_hash(client: TestClient, auth: dict[str, str]) -> None:
    sensor = register(client, auth, make_series(client, auth))

    listed = client.get("/sensors", headers=auth)
    one = client.get(f"/sensors/{sensor['id']}", headers=auth)

    assert listed.status_code == one.status_code == 200
    expected = {key: value for key, value in sensor.items() if key != "apiKey"}
    assert listed.json() == [expected]
    assert one.json() == expected
    for response in (listed, one):
        assert sensor["apiKey"] not in response.text
        assert "hash" not in response.text.lower()


def test_unknown_series_is_422_on_the_series_id(client: TestClient, auth: dict[str, str]) -> None:
    response = client.post("/sensors", json={"name": "x", "seriesId": 999999}, headers=auth)

    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    assert [error["field"] for error in response.json()["errors"]] == ["seriesId"]


def test_bad_bodies_are_400(client: TestClient, auth: dict[str, str]) -> None:
    series_id = make_series(client, auth)

    for body in (
        {"seriesId": series_id},
        {"name": "", "seriesId": series_id},
        {"name": "x" * 101, "seriesId": series_id},
        {"name": "x"},
        {"name": "x", "seriesId": "1"},
        {"name": "x", "seriesId": True},
        {"name": "x", "seriesId": 2**63},
    ):
        assert client.post("/sensors", json=body, headers=auth).status_code == 400, body


def test_delete_returns_204_then_404(client: TestClient, auth: dict[str, str]) -> None:
    sensor = register(client, auth, make_series(client, auth))

    assert client.delete(f"/sensors/{sensor['id']}", headers=auth).status_code == 204
    assert client.get(f"/sensors/{sensor['id']}", headers=auth).status_code == 404
    assert client.delete(f"/sensors/{sensor['id']}", headers=auth).status_code == 404
    assert client.get("/sensors", headers=auth).json() == []


def test_unknown_and_huge_ids(client: TestClient, auth: dict[str, str]) -> None:
    assert client.get("/sensors/999", headers=auth).status_code == 404
    assert client.get(f"/sensors/{2**63}", headers=auth).status_code == 400


def test_every_route_needs_the_administrator(client: TestClient, auth: dict[str, str]) -> None:
    series_id = make_series(client, auth)
    sensor = register(client, auth, series_id)
    body = {"name": "x", "seriesId": series_id}

    for headers in ({}, {"Authorization": "Bearer not-a-real-token"}):
        assert client.get("/sensors", headers=headers).status_code == 401
        assert client.get(f"/sensors/{sensor['id']}", headers=headers).status_code == 401
        assert client.post("/sensors", json=body, headers=headers).status_code == 401
        assert client.delete(f"/sensors/{sensor['id']}", headers=headers).status_code == 401
    # Authentication comes before the body.
    assert client.post("/sensors", json={}).status_code == 401
    assert client.get("/sensors", headers=auth).json()[0]["id"] == sensor["id"]


def test_deleting_the_series_deletes_its_sensors(client: TestClient, auth: dict[str, str]) -> None:
    series_id = make_series(client, auth)
    sensor = register(client, auth, series_id)

    assert client.delete(f"/series/{series_id}", headers=auth).status_code == 204
    assert client.get(f"/sensors/{sensor['id']}", headers=auth).status_code == 404


def test_a_taken_name_is_a_422_on_the_name_field(client: TestClient, auth: dict[str, str]) -> None:
    series_id = make_series(client, auth)
    register(client, auth, series_id, "Warsaw station")

    for name in ("Warsaw station", "WARSAW Station", " Warsaw station "):
        response = client.post("/sensors", json={"name": name, "seriesId": series_id}, headers=auth)

        assert response.status_code == 422
        assert response.json()["errors"] == [{"field": "name", "message": "A sensor with this name already exists"}]
    assert len(client.get("/sensors", headers=auth).json()) == 1


def test_the_same_name_is_free_again_after_the_sensor_is_deleted(client: TestClient, auth: dict[str, str]) -> None:
    series_id = make_series(client, auth)
    sensor = register(client, auth, series_id, "Warsaw station")
    client.delete(f"/sensors/{sensor['id']}", headers=auth)

    register(client, auth, series_id, "Warsaw station")
