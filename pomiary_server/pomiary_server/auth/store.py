"""Administrators and their login sessions: hashing, tokens and the SQL behind them.

A password is stored as an Argon2id hash. A session token is random and opaque; only its
SHA-256 is stored, so a copy of the database cannot be used to log in.
"""

import hashlib
import secrets
from dataclasses import dataclass

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from psycopg import Connection

# argon2-cffi's defaults are Argon2id with the parameters RFC 9106 recommends.
hasher = PasswordHasher()

# Verified against when the username is unknown, so that "no such user" takes as long as
# "wrong password" and the response time does not tell which usernames exist.
UNKNOWN_USER_HASH = hasher.hash(secrets.token_urlsafe(16))


@dataclass(frozen=True)
class Admin:
    id: int
    username: str
    password_hash: str


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        return hasher.verify(password_hash or UNKNOWN_USER_HASH, password) and password_hash is not None
    except (VerificationError, InvalidHashError):
        return False


def find_admin(conn: Connection, username: str) -> Admin | None:
    row = conn.execute("SELECT id, username, password_hash FROM admins WHERE username = %s", (username,)).fetchone()
    return Admin(*row) if row else None


def bootstrap_admin(conn: Connection, username: str, password: str) -> bool:
    """Creates the first administrator; False when one exists already (or another server
    starting at the same moment was faster)."""
    created = conn.execute(
        "INSERT INTO admins (username, password_hash) SELECT %s, %s WHERE NOT EXISTS (SELECT 1 FROM admins) ON CONFLICT DO NOTHING",
        (username, hasher.hash(password)),
    ).rowcount
    # Committed here, not when the request's connection is returned: the answer must not
    # reach the client before the change is visible to its next request.
    conn.commit()
    return created == 1


def open_session(conn: Connection, admin_id: int, ttl_seconds: int) -> str:
    token = secrets.token_urlsafe(32)
    conn.execute("DELETE FROM sessions WHERE expires_at < now()")  # the table cleans itself at login
    conn.execute(
        "INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (%s, %s, now() + make_interval(secs => %s))",
        (token_hash(token), admin_id, ttl_seconds),
    )
    conn.commit()
    return token


def admin_for_token(conn: Connection, token: str) -> Admin | None:
    row = conn.execute(
        "SELECT a.id, a.username, a.password_hash FROM sessions s JOIN admins a ON a.id = s.admin_id "
        "WHERE s.token_hash = %s AND s.expires_at > now()",
        (token_hash(token),),
    ).fetchone()
    return Admin(*row) if row else None


def close_session(conn: Connection, token: str) -> None:
    conn.execute("DELETE FROM sessions WHERE token_hash = %s", (token_hash(token),))
    conn.commit()


def change_password(conn: Connection, admin_id: int, new_password: str, keep_token: str) -> None:
    """Sets the password and ends every session of the admin except the current one."""
    conn.execute("UPDATE admins SET password_hash = %s WHERE id = %s", (hasher.hash(new_password), admin_id))
    conn.execute("DELETE FROM sessions WHERE admin_id = %s AND token_hash <> %s", (admin_id, token_hash(keep_token)))
    conn.commit()
