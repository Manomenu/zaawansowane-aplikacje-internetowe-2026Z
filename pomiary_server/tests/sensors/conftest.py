from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from psycopg import Connection
from psycopg_pool import ConnectionPool

from pomiary_server.auth import store
from tests.auth.conftest import PASSWORD, USERNAME


@pytest.fixture
def conn(pool: ConnectionPool) -> Iterator[Connection]:
    """Empty series (and with them sensors and measurements) and no admins to begin with."""
    with pool.connection() as conn:
        conn.execute("TRUNCATE series, sessions, admins RESTART IDENTITY CASCADE")
        conn.commit()
        yield conn


@pytest.fixture
def auth(client: TestClient, conn: Connection) -> dict[str, str]:
    """The Authorization header of a logged-in administrator."""
    assert store.bootstrap_admin(conn, USERNAME, PASSWORD)
    response = client.post("/auth/login", json={"username": USERNAME, "password": PASSWORD})
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}
