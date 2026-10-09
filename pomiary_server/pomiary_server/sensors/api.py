"""The sensor routes: all for administrators. The key is sent once, by the registration."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Response
from psycopg import Connection

from pomiary_server import db
from pomiary_server.auth.api import CurrentAdmin
from pomiary_server.sensors import store
from pomiary_server.sensors.model import Sensor, SensorCreated, SensorInput
from pomiary_server.settings import settings

router = APIRouter(prefix="/sensors", tags=["sensors"])

Conn = Annotated[Connection, Depends(db.connection)]
# Capped at bigint, so a huge id is a 400 and not a database error.
SensorId = Annotated[int, Path(le=2**63 - 1)]


def not_found() -> HTTPException:
    return HTTPException(404, "No such sensor")


# `_admin` comes before `body` in each route: the authentication is checked first.
@router.get("")
def list_sensors(_admin: CurrentAdmin, conn: Conn) -> list[Sensor]:
    return store.list_sensors(conn)


@router.get("/{sensor_id}")
def get_sensor(sensor_id: SensorId, _admin: CurrentAdmin, conn: Conn) -> Sensor:
    sensor = store.find_sensor(conn, sensor_id)
    if sensor is None:
        raise not_found()
    return sensor


@router.post("", status_code=201)
def create_sensor(_admin: CurrentAdmin, body: SensorInput, conn: Conn, response: Response) -> SensorCreated:
    sensor = store.create_sensor(conn, body)
    response.headers["Location"] = f"{settings.public_api_prefix}/sensors/{sensor.id}"
    return sensor


@router.delete("/{sensor_id}", status_code=204)
def delete_sensor(sensor_id: SensorId, _admin: CurrentAdmin, conn: Conn) -> None:
    if not store.delete_sensor(conn, sensor_id):
        raise not_found()
