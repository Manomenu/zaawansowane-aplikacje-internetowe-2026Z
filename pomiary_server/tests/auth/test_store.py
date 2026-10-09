from psycopg import Connection

from pomiary_server.auth import store
from tests.auth.conftest import PASSWORD, USERNAME


def count_admins(conn: Connection) -> int:
    row = conn.execute("SELECT count(*) FROM admins").fetchone()
    assert row is not None
    return row[0]


def test_bootstrap_creates_exactly_one_admin_and_is_idempotent(conn: Connection) -> None:
    assert store.bootstrap_admin(conn, USERNAME, PASSWORD)
    assert not store.bootstrap_admin(conn, USERNAME, "another password")
    assert not store.bootstrap_admin(conn, "someone-else", PASSWORD)

    assert count_admins(conn) == 1
    admin = store.find_admin(conn, USERNAME)
    assert admin is not None
    assert store.verify_password(admin.password_hash, PASSWORD)


def test_the_password_is_stored_as_argon2id(conn: Connection, admin: store.Admin) -> None:
    assert admin.password_hash.startswith("$argon2id$")
    assert PASSWORD not in admin.password_hash


def test_only_the_hash_of_a_token_is_stored(conn: Connection, admin: store.Admin) -> None:
    token = store.open_session(conn, admin.id, 60)

    stored = conn.execute("SELECT token_hash FROM sessions").fetchall()
    assert stored == [(store.token_hash(token),)]
    assert token not in stored[0][0]


def test_an_expired_session_does_not_authenticate(conn: Connection, admin: store.Admin) -> None:
    token = store.open_session(conn, admin.id, 60)
    conn.execute("UPDATE sessions SET expires_at = now() - interval '1 second'")

    assert store.admin_for_token(conn, token) is None


def test_opening_a_session_drops_the_expired_ones(conn: Connection, admin: store.Admin) -> None:
    store.open_session(conn, admin.id, -1)
    store.open_session(conn, admin.id, 60)

    row = conn.execute("SELECT count(*) FROM sessions").fetchone()
    assert row == (1,)


def test_an_unknown_user_fails_like_a_wrong_password() -> None:
    assert not store.verify_password(None, PASSWORD)
    assert not store.verify_password(store.UNKNOWN_USER_HASH, PASSWORD)
