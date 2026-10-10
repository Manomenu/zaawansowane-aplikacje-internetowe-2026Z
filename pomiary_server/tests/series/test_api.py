from typing import Any

import pytest
from fastapi.testclient import TestClient
from psycopg import Connection

NEW: dict[str, Any] = {"name": "Air temperature", "minValue": -40, "maxValue": 45, "color": "#1f77b4", "icon": "thermometer", "unit": "°C"}
GARBAGE = {"Authorization": "Bearer not-a-real-token"}


def create(client: TestClient, auth: dict[str, str], **over: Any) -> dict[str, Any]:
    response = client.post("/series", json={**NEW, **over}, headers=auth)
    assert response.status_code == 201
    return response.json()


def add_measurements(conn: Connection, series_id: int, values: list[float]) -> None:
    for value in values:
        conn.execute("INSERT INTO measurements (series_id, value, measured_at) VALUES (%s, %s, now())", (series_id, value))
    conn.commit()


def test_create_returns_201_with_location_and_camel_case_fields(client: TestClient, auth: dict[str, str]) -> None:
    response = client.post("/series", json=NEW, headers=auth)

    assert response.status_code == 201
    body = response.json()
    assert response.headers["location"] == f"/api/series/{body['id']}"
    assert body == {**NEW, "id": body["id"]}


def test_optional_fields_default_to_null(client: TestClient, auth: dict[str, str]) -> None:
    body = create(client, auth, icon=None, unit=None)

    assert body["icon"] is None
    assert body["unit"] is None
    minimal = client.post("/series", json={"name": "x", "minValue": 0, "maxValue": 1, "color": "#000000"}, headers=auth).json()
    assert minimal["icon"] is None
    assert minimal["unit"] is None


def test_get_is_public_and_lists_by_id(client: TestClient, auth: dict[str, str]) -> None:
    first, second = create(client, auth, name="a"), create(client, auth, name="b")

    listed = client.get("/series")
    one = client.get(f"/series/{second['id']}")

    assert listed.status_code == 200
    assert listed.json() == [first, second]
    assert one.status_code == 200
    assert one.json() == second


def test_the_list_is_empty_at_the_start(client: TestClient, conn: Connection) -> None:
    assert client.get("/series").json() == []


def test_put_replaces_the_series(client: TestClient, auth: dict[str, str]) -> None:
    series = create(client, auth)
    changed = {"name": "Renamed", "minValue": 0, "maxValue": 10.5, "color": "#FF7F0E", "icon": None, "unit": None}

    response = client.put(f"/series/{series['id']}", json=changed, headers=auth)

    assert response.status_code == 200
    assert response.json() == {**changed, "id": series["id"]}
    assert client.get(f"/series/{series['id']}").json() == response.json()


def test_delete_removes_the_series(client: TestClient, auth: dict[str, str]) -> None:
    series = create(client, auth)

    assert client.delete(f"/series/{series['id']}", headers=auth).status_code == 204
    assert client.get(f"/series/{series['id']}").status_code == 404
    assert client.get("/series").json() == []


def test_an_unknown_series_is_a_404_problem(client: TestClient, auth: dict[str, str]) -> None:
    path = "/series/999999"
    responses = [
        client.get(path),
        client.put(path, json=NEW, headers=auth),
        client.delete(path, headers=auth),
    ]

    for response in responses:
        assert response.status_code == 404
        assert response.headers["content-type"] == "application/problem+json"
        assert response.json()["status"] == 404


@pytest.mark.parametrize("min_value", [10, 11])
def test_min_not_below_max_is_422_on_post_and_put(client: TestClient, auth: dict[str, str], min_value: int) -> None:
    series = create(client, auth)
    bad = {**NEW, "minValue": min_value, "maxValue": 10}

    for response in (client.post("/series", json=bad, headers=auth), client.put(f"/series/{series['id']}", json=bad, headers=auth)):
        assert response.status_code == 422
        assert response.headers["content-type"] == "application/problem+json"
        assert {error["field"] for error in response.json()["errors"]} == {"minValue", "maxValue"}
    assert client.get("/series").json() == [series]


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"minValue": 0, "maxValue": 1, "color": "#000000"}, "name"),
        ({"name": "", "minValue": 0, "maxValue": 1, "color": "#000000"}, "name"),
        ({"name": "x" * 101, "minValue": 0, "maxValue": 1, "color": "#000000"}, "name"),
        ({"name": "x", "minValue": 0, "maxValue": 1, "color": "red"}, "color"),
        ({"name": "x", "minValue": 0, "maxValue": 1, "color": "#12345"}, "color"),
        ({"name": "x", "minValue": "0", "maxValue": 1, "color": "#000000"}, "minValue"),
        ({"name": "x", "minValue": 0, "maxValue": True, "color": "#000000"}, "maxValue"),
        ({"name": "x", "minValue": 0, "maxValue": None, "color": "#000000"}, "maxValue"),
        ({"name": "x", "minValue": 0, "maxValue": 1, "color": "#000000", "unit": "x" * 21}, "unit"),
        ({"name": "x", "minValue": 0, "maxValue": 1, "color": "#000000", "icon": 5}, "icon"),
    ],
)
def test_a_body_that_breaks_the_schema_is_400(client: TestClient, auth: dict[str, str], body: dict[str, Any], field: str) -> None:
    series = create(client, auth)

    for response in (client.post("/series", json=body, headers=auth), client.put(f"/series/{series['id']}", json=body, headers=auth)):
        assert response.status_code == 400
        assert response.headers["content-type"] == "application/problem+json"
        assert [error["field"] for error in response.json()["errors"]] == [field]


def test_nan_and_infinity_are_not_numbers(client: TestClient, auth: dict[str, str]) -> None:
    raw = '{"name": "x", "minValue": NaN, "maxValue": Infinity, "color": "#000000"}'

    response = client.post("/series", content=raw, headers={**auth, "Content-Type": "application/json"})

    assert response.status_code == 400


@pytest.mark.parametrize("headers", [{}, GARBAGE])
def test_changing_series_without_a_valid_token_is_401(client: TestClient, auth: dict[str, str], headers: dict[str, str]) -> None:
    series = create(client, auth)
    path = f"/series/{series['id']}"
    responses = [
        client.post("/series", json=NEW, headers=headers),
        client.put(path, json=NEW, headers=headers),
        client.delete(path, headers=headers),
    ]

    for response in responses:
        assert response.status_code == 401
        assert response.headers["www-authenticate"] == "Bearer"
        assert response.headers["content-type"] == "application/problem+json"
    assert client.get("/series").json() == [series]


@pytest.mark.parametrize("headers", [{}, GARBAGE])
def test_authentication_comes_before_validation(client: TestClient, auth: dict[str, str], headers: dict[str, str]) -> None:
    series = create(client, auth)
    bad = {"name": ""}

    assert client.post("/series", json=bad, headers=headers).status_code == 401
    assert client.put(f"/series/{series['id']}", json=bad, headers=headers).status_code == 401
    assert client.put("/series/999999", json=NEW, headers=headers).status_code == 401


def test_put_that_excludes_stored_measurements_is_409(client: TestClient, auth: dict[str, str], conn: Connection) -> None:
    series = create(client, auth, minValue=0, maxValue=100)
    add_measurements(conn, series["id"], [10, 20, 30])

    for narrowed in ({"minValue": 15, "maxValue": 100}, {"minValue": 0, "maxValue": 25}):
        response = client.put(f"/series/{series['id']}", json={**NEW, **narrowed}, headers=auth)
        assert response.status_code == 409
        assert response.headers["content-type"] == "application/problem+json"
    assert client.get(f"/series/{series['id']}").json() == series


def test_put_that_keeps_stored_measurements_is_200(client: TestClient, auth: dict[str, str], conn: Connection) -> None:
    series = create(client, auth, minValue=0, maxValue=100)
    add_measurements(conn, series["id"], [10, 20, 30])

    exact = client.put(f"/series/{series['id']}", json={**NEW, "minValue": 10, "maxValue": 30}, headers=auth)
    wider = client.put(f"/series/{series['id']}", json={**NEW, "minValue": -5, "maxValue": 500}, headers=auth)

    assert exact.status_code == 200
    assert wider.status_code == 200


def test_measurements_of_another_series_do_not_block_a_change(client: TestClient, auth: dict[str, str], conn: Connection) -> None:
    mine, other = create(client, auth, name="mine"), create(client, auth, name="other")
    add_measurements(conn, other["id"], [90])

    response = client.put(f"/series/{mine['id']}", json={**NEW, "minValue": 0, "maxValue": 10}, headers=auth)

    assert response.status_code == 200


def test_delete_takes_sensors_and_measurements_along(client: TestClient, auth: dict[str, str], conn: Connection) -> None:
    series, kept = create(client, auth, name="series"), create(client, auth, name="kept")
    for owner in (series, kept):
        sensor_id = conn.execute(
            "INSERT INTO sensors (name, series_id, api_key_hash) VALUES (%s, %s, %s) RETURNING id",
            (owner["name"], owner["id"], f"hash-{owner['id']}"),
        ).fetchone()
        assert sensor_id is not None
        conn.execute(
            "INSERT INTO measurements (series_id, sensor_id, value, measured_at) VALUES (%s, %s, 1, now())", (owner["id"], sensor_id[0])
        )
    conn.commit()

    assert client.delete(f"/series/{series['id']}", headers=auth).status_code == 204

    counts = conn.execute("SELECT (SELECT count(*) FROM sensors), (SELECT count(*) FROM measurements)").fetchone()
    assert counts == (1, 1)
    assert conn.execute("SELECT series_id FROM measurements").fetchone() == (kept["id"],)


def test_an_id_beyond_bigint_is_a_400_not_a_database_error(client: TestClient) -> None:
    response = client.get("/series/99999999999999999999999")

    assert response.status_code == 400


def test_a_taken_name_is_a_422_on_the_name_field(client: TestClient, auth: dict[str, str]) -> None:
    create(client, auth, name="Air temperature")

    for name in ("Air temperature", "air TEMPERATURE", "  Air temperature  "):
        response = client.post("/series", json={**NEW, "name": name}, headers=auth)

        assert response.status_code == 422
        assert response.json()["errors"] == [{"field": "name", "message": "A series with this name already exists"}]
    assert len(client.get("/series").json()) == 1


def test_the_name_is_stored_without_surrounding_spaces(client: TestClient, auth: dict[str, str]) -> None:
    assert create(client, auth, name="  Padded  ")["name"] == "Padded"
    assert client.post("/series", json={**NEW, "name": "   "}, headers=auth).status_code == 400


def test_renaming_to_another_series_name_is_a_422(client: TestClient, auth: dict[str, str]) -> None:
    create(client, auth, name="first")
    second = create(client, auth, name="second")

    response = client.put(f"/series/{second['id']}", json={**NEW, "name": "FIRST"}, headers=auth)

    assert response.status_code == 422
    assert response.json()["errors"] == [{"field": "name", "message": "A series with this name already exists"}]
    assert client.get(f"/series/{second['id']}").json()["name"] == "second"


def test_a_series_may_keep_its_own_name_or_change_its_case(client: TestClient, auth: dict[str, str]) -> None:
    series = create(client, auth, name="first")

    same = client.put(f"/series/{series['id']}", json={**NEW, "name": "first", "maxValue": 50}, headers=auth)
    recased = client.put(f"/series/{series['id']}", json={**NEW, "name": "First"}, headers=auth)

    assert same.status_code == 200
    assert recased.status_code == 200
    assert recased.json()["name"] == "First"
