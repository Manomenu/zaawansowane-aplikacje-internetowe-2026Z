from fastapi.testclient import TestClient
from psycopg import Connection

from pomiary_server.auth import store
from tests.auth.conftest import PASSWORD, USERNAME


def login(client: TestClient, password: str = PASSWORD) -> str:
    response = client.post("/auth/login", json={"username": USERNAME, "password": password})
    assert response.status_code == 200
    return response.json()["accessToken"]


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_login_returns_a_bearer_token(client: TestClient, admin: store.Admin) -> None:
    response = client.post("/auth/login", json={"username": USERNAME, "password": PASSWORD})

    assert response.status_code == 200
    body = response.json()
    assert body["tokenType"] == "Bearer"
    assert body["expiresIn"] == 3600
    assert len(body["accessToken"]) >= 32
    assert "set-cookie" not in response.headers


def test_a_wrong_password_and_an_unknown_user_get_the_same_401(client: TestClient, admin: store.Admin) -> None:
    wrong = client.post("/auth/login", json={"username": USERNAME, "password": "wrong"})
    unknown = client.post("/auth/login", json={"username": "nobody", "password": PASSWORD})

    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    assert wrong.headers["content-type"] == "application/problem+json"


def test_login_without_a_field_is_400(client: TestClient, admin: store.Admin) -> None:
    response = client.post("/auth/login", json={"username": USERNAME})

    assert response.status_code == 400
    assert response.json()["errors"][0]["field"] == "password"


def test_logout_revokes_the_token(client: TestClient, admin: store.Admin) -> None:
    token = login(client)

    assert client.post("/auth/logout", headers=bearer(token)).status_code == 204
    assert client.post("/auth/logout", headers=bearer(token)).status_code == 401


def test_logout_without_a_token_is_401_with_the_challenge(client: TestClient, admin: store.Admin) -> None:
    response = client.post("/auth/logout")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_password_change_works_and_keeps_only_the_current_session(client: TestClient, admin: store.Admin) -> None:
    current, other = login(client), login(client)

    response = client.put("/auth/password", json={"currentPassword": PASSWORD, "newPassword": "a brand new one"}, headers=bearer(current))

    assert response.status_code == 204
    assert client.post("/auth/logout", headers=bearer(other)).status_code == 401
    assert client.post("/auth/login", json={"username": USERNAME, "password": PASSWORD}).status_code == 401
    assert client.post("/auth/login", json={"username": USERNAME, "password": "a brand new one"}).status_code == 200
    assert client.post("/auth/logout", headers=bearer(current)).status_code == 204


def test_password_change_with_a_wrong_current_password_is_403(client: TestClient, admin: store.Admin) -> None:
    token = login(client)

    response = client.put("/auth/password", json={"currentPassword": "wrong", "newPassword": "a brand new one"}, headers=bearer(token))

    assert response.status_code == 403
    assert client.post("/auth/login", json={"username": USERNAME, "password": PASSWORD}).status_code == 200


def test_password_change_without_a_token_is_401_whatever_the_body(client: TestClient, admin: store.Admin) -> None:
    valid = client.put("/auth/password", json={"currentPassword": PASSWORD, "newPassword": "a brand new one"})
    invalid = client.put("/auth/password", json={"currentPassword": PASSWORD, "newPassword": "short"})

    assert valid.status_code == invalid.status_code == 401


def test_a_too_short_new_password_is_400(client: TestClient, admin: store.Admin) -> None:
    token = login(client)

    response = client.put("/auth/password", json={"currentPassword": PASSWORD, "newPassword": "short"}, headers=bearer(token))

    assert response.status_code == 400
    assert response.json()["errors"][0]["field"] == "newPassword"


def test_an_expired_token_is_401(client: TestClient, conn: Connection, admin: store.Admin) -> None:
    token = login(client)
    conn.execute("UPDATE sessions SET expires_at = now() - interval '1 second'")
    conn.commit()

    assert client.post("/auth/logout", headers=bearer(token)).status_code == 401


def test_forged_tokens_are_401(client: TestClient, admin: store.Admin) -> None:
    # The teacher's forged JWT (alg "none") and plain garbage.
    forged = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiJ9."  # gitleaks:allow — a fake token is the point of the test
    for token in [forged, "garbage", ""]:
        assert client.post("/auth/logout", headers=bearer(token)).status_code == 401, token
    assert client.post("/auth/logout", headers={"Authorization": f"Basic {PASSWORD}"}).status_code == 401
