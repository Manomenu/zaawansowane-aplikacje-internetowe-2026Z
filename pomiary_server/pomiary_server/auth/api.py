"""Login, logout and password change — and `current_admin`, which guards every admin route."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg import Connection

from pomiary_server import db
from pomiary_server.auth import store
from pomiary_server.auth.model import LoginRequest, LoginResponse, PasswordChange
from pomiary_server.auth.store import Admin
from pomiary_server.settings import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# auto_error off: its own error is a 403 with no Problem body; ours is a 401 with the header.
bearer = HTTPBearer(auto_error=False)

Conn = Annotated[Connection, Depends(db.connection)]


def unauthorized(detail: str) -> HTTPException:
    return HTTPException(401, detail, headers={"WWW-Authenticate": "Bearer"})


def bearer_token(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> str:
    if credentials is None:
        raise unauthorized("Authentication required")
    return credentials.credentials


Token = Annotated[str, Depends(bearer_token)]


def current_admin(token: Token, conn: Conn) -> Admin:
    """Dependency for admin routes: the administrator the Bearer token belongs to, or 401."""
    admin = store.admin_for_token(conn, token)
    if admin is None:
        raise unauthorized("The token is invalid or has expired")
    return admin


CurrentAdmin = Annotated[Admin, Depends(current_admin)]


@router.post("/login")
def login(body: LoginRequest, conn: Conn) -> LoginResponse:
    admin = store.find_admin(conn, body.username)
    # One answer for an unknown user and a wrong password.
    if not store.verify_password(admin.password_hash if admin else None, body.password) or admin is None:
        raise HTTPException(401, "Invalid username or password")
    token = store.open_session(conn, admin.id, settings.token_ttl_seconds)
    return LoginResponse(access_token=token, expires_in=settings.token_ttl_seconds)


@router.post("/logout", status_code=204)
def logout(token: Token, _admin: CurrentAdmin, conn: Conn) -> None:
    store.close_session(conn, token)


@router.put("/password", status_code=204)
def change_password(body: PasswordChange, token: Token, admin: CurrentAdmin, conn: Conn) -> None:
    if not store.verify_password(admin.password_hash, body.current_password):
        raise HTTPException(403, "The current password is wrong")
    store.change_password(conn, admin.id, body.new_password, token)
