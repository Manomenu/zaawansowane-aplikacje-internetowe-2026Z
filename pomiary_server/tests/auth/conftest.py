from collections.abc import Iterator

import pytest
from psycopg import Connection
from psycopg_pool import ConnectionPool

from pomiary_server.auth import store

USERNAME = "admin"
PASSWORD = "correct horse battery"  # noqa: S105 — a fixture value for the test database


@pytest.fixture
def conn(pool: ConnectionPool) -> Iterator[Connection]:
    with pool.connection() as conn:
        conn.execute("TRUNCATE sessions, admins RESTART IDENTITY CASCADE")
        conn.commit()
        yield conn


@pytest.fixture
def admin(conn: Connection) -> store.Admin:
    assert store.bootstrap_admin(conn, USERNAME, PASSWORD)
    found = store.find_admin(conn, USERNAME)
    assert found is not None
    return found
