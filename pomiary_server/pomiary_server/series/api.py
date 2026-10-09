"""The series routes: reading is public, changing needs an administrator."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Response
from psycopg import Connection

from pomiary_server import db
from pomiary_server.auth.api import CurrentAdmin
from pomiary_server.problems import FieldError, Unprocessable
from pomiary_server.series import store
from pomiary_server.series.model import Series, SeriesInput
from pomiary_server.settings import settings

router = APIRouter(prefix="/series", tags=["series"])

Conn = Annotated[Connection, Depends(db.connection)]
# Capped at bigint, so a huge id is a 400 and not a database error.
SeriesId = Annotated[int, Path(le=2**63 - 1)]


def not_found() -> HTTPException:
    return HTTPException(404, "No such series")


def check_range(data: SeriesInput) -> None:
    if data.min_value >= data.max_value:
        message = "minValue must be less than maxValue"
        raise Unprocessable(message, [FieldError(field="minValue", message=message), FieldError(field="maxValue", message=message)])


@router.get("")
def list_series(conn: Conn) -> list[Series]:
    return store.list_series(conn)


@router.get("/{series_id}")
def get_series(series_id: SeriesId, conn: Conn) -> Series:
    series = store.find_series(conn, series_id)
    if series is None:
        raise not_found()
    return series


# `_admin` comes before `body` in each admin route: the authentication is checked first.
@router.post("", status_code=201)
def create_series(_admin: CurrentAdmin, body: SeriesInput, conn: Conn, response: Response) -> Series:
    check_range(body)
    series = store.create_series(conn, body)
    response.headers["Location"] = f"{settings.public_api_prefix}/series/{series.id}"
    return series


@router.put("/{series_id}")
def update_series(series_id: SeriesId, _admin: CurrentAdmin, body: SeriesInput, conn: Conn) -> Series:
    check_range(body)
    series = store.update_series(conn, series_id, body)
    if series is None:
        raise not_found()
    return series


@router.delete("/{series_id}", status_code=204)
def delete_series(series_id: SeriesId, _admin: CurrentAdmin, conn: Conn) -> None:
    if not store.delete_series(conn, series_id):
        raise not_found()
