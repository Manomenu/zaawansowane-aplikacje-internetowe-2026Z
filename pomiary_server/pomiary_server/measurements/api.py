"""The measurement routes: reading is public, writing is for sensors only (`X-API-Key`)."""

from collections.abc import AsyncIterator
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response
from fastapi.responses import StreamingResponse
from fastapi.security import APIKeyHeader
from psycopg import Connection

from pomiary_server import db
from pomiary_server.measurements import store
from pomiary_server.measurements.model import Measurement, MeasurementInput, MeasurementQuery, Timestamp
from pomiary_server.sensors import store as sensors_store
from pomiary_server.sensors.model import Sensor
from pomiary_server.settings import settings

router = APIRouter(prefix="/measurements", tags=["measurements"])

Conn = Annotated[Connection, Depends(db.connection)]
# Capped at bigint, so a huge id is a 400 and not a database error.
MeasurementId = Annotated[int, Path(le=2**63 - 1)]

# auto_error off: its own error is a 403 with no Problem body; ours is a 401.
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def current_sensor(key: Annotated[str | None, Depends(api_key_header)], conn: Conn) -> Sensor:
    """Dependency for the sensors' route: the sensor the key belongs to, or 401. A Bearer
    token of an administrator is not a way in."""
    if key is None:
        raise HTTPException(401, "An X-API-Key header is required")
    sensor = sensors_store.sensor_for_key(conn, key)
    if sensor is None:
        raise HTTPException(401, "The API key is not valid")
    return sensor


CurrentSensor = Annotated[Sensor, Depends(current_sensor)]

MAX_ID = 2**63 - 1


def parse_series(text: str | None) -> list[int] | None:
    """`1,3` -> [1, 3]; None (no filter) when the parameter is absent."""
    if text is None:
        return None
    parts = text.split(",")
    if not all(part.isascii() and part.isdecimal() and 0 < int(part) <= MAX_ID for part in parts):
        raise HTTPException(400, "series must be a comma-separated list of series ids")
    return [int(part) for part in parts]


# One argument per query parameter of the contract: FastAPI reads them from the signature.
@router.get("")
def list_measurements(  # noqa: PLR0913 — the contract's five query parameters plus the connection
    *,
    conn: Conn,
    series: str | None = None,
    # Offsetless values are refused (400) rather than guessed to be UTC; note that an unencoded
    # `+` in a query string arrives as a space.
    start: Annotated[Timestamp | None, Query(alias="from")] = None,
    end: Annotated[Timestamp | None, Query(alias="to")] = None,
    sort: Literal["timestamp", "-timestamp"] = "timestamp",
    limit: Annotated[int, Query(ge=1, le=10000)] = 1000,
) -> list[Measurement]:
    return store.list_measurements(conn, MeasurementQuery(parse_series(series), start, end, sort, limit))


# Quiet this long, and a comment goes out so that proxies do not close an idle connection.
HEARTBEAT_SECONDS = 15


class OpenStreams:
    """How many live streams are open in this process."""

    count = 0


async def events(series: list[int] | None) -> AsyncIterator[str]:
    OpenStreams.count += 1
    try:
        async for measurement in store.listen(settings.database_url, series, HEARTBEAT_SECONDS):
            if measurement is None:
                yield ": ping\n\n"
            else:
                yield f"event: measurement\ndata: {measurement.model_dump_json(by_alias=True)}\n\n"
    finally:
        OpenStreams.count -= 1


# Declared before `/{measurement_id}`, which would take "stream" for an id.
@router.get("/stream", response_class=StreamingResponse, responses={200: {"content": {"text/event-stream": {}}}})
def stream_measurements(series: str | None = None) -> StreamingResponse:
    """Server-Sent Events: an event `measurement` (the Measurement as JSON) for every measurement
    stored after the connection was opened, optionally only of `series`."""
    ids = parse_series(series)
    if OpenStreams.count >= settings.max_streams:
        raise HTTPException(503, "Too many live streams are open; try again later", headers={"Retry-After": "30"})
    headers = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    return StreamingResponse(events(ids), media_type="text/event-stream", headers=headers)


@router.get("/{measurement_id}")
def get_measurement(measurement_id: MeasurementId, conn: Conn) -> Measurement:
    measurement = store.find_measurement(conn, measurement_id)
    if measurement is None:
        raise HTTPException(404, "No such measurement")
    return measurement


# `sensor` comes before `body`: the key is checked first.
@router.post("", status_code=201)
def create_measurement(sensor: CurrentSensor, body: MeasurementInput, conn: Conn, response: Response) -> Measurement:
    measurement = store.add_measurement(conn, sensor, body.value, body.timestamp)
    if measurement is None:
        raise HTTPException(401, "The sensor's series no longer exists")
    response.headers["Location"] = f"{settings.public_api_prefix}/measurements/{measurement.id}"
    return measurement
