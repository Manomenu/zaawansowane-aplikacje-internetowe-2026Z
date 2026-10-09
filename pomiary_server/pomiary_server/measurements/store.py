"""The SQL behind the measurement routes, and the rules a stored measurement must keep.

A rejected measurement is logged at WARNING (the "error log" of requirement F4) and not stored.
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import LiteralString

from psycopg import Connection

from pomiary_server.measurements.model import Measurement, MeasurementQuery
from pomiary_server.problems import FieldError, Unprocessable
from pomiary_server.sensors.model import Sensor

log = logging.getLogger("uvicorn.error")

# A sensor's clock may run a little ahead; further ahead is a mistake.
MAX_AHEAD = timedelta(minutes=5)

COLUMNS = "id, series_id, sensor_id, value, measured_at"


def to_measurement(row: tuple[int, int, int | None, float, datetime]) -> Measurement:
    return Measurement(id=row[0], series_id=row[1], sensor_id=row[2], value=row[3], timestamp=row[4])


def reject(sensor: Sensor, value: float, errors: list[FieldError]) -> Unprocessable:
    reason = "; ".join(error.message for error in errors)
    log.warning("measurement rejected: sensor %s, series %s, value %g: %s", sensor.id, sensor.series_id, value, reason)
    return Unprocessable(reason, errors)


def add_measurement(conn: Connection, sensor: Sensor, value: float, timestamp: datetime | None) -> Measurement | None:
    """Stores the measurement of `sensor`; None when its series is gone. Raises Unprocessable
    (and stores nothing) when the value is outside the series' range or the time is too far ahead."""
    now = datetime.now(UTC)
    # FOR SHARE keeps a range change (which takes FOR UPDATE on the row) from slipping in between
    # this check and the insert, so a stored value is never outside the stored range.
    bounds = conn.execute("SELECT min_value, max_value FROM series WHERE id = %s FOR SHARE", (sensor.series_id,)).fetchone()
    if bounds is None:
        conn.rollback()
        return None
    errors: list[FieldError] = []
    if not bounds[0] <= value <= bounds[1]:
        errors.append(FieldError(field="value", message=f"The value must be between {bounds[0]:g} and {bounds[1]:g}"))
    if timestamp is not None and timestamp > now + MAX_AHEAD:
        errors.append(FieldError(field="timestamp", message="The timestamp must not be more than 5 minutes ahead of the server's time"))
    if errors:
        conn.rollback()
        raise reject(sensor, value, errors)
    row = conn.execute(
        f"INSERT INTO measurements (series_id, sensor_id, value, measured_at) VALUES (%s, %s, %s, %s) RETURNING {COLUMNS}",  # noqa: S608 — a constant
        (sensor.series_id, sensor.id, value, timestamp or now),
    ).fetchone()
    conn.execute("UPDATE sensors SET last_measurement_at = %s WHERE id = %s", (now, sensor.id))
    conn.commit()
    assert row is not None  # noqa: S101 — RETURNING always gives the row
    return to_measurement(row)


def find_measurement(conn: Connection, measurement_id: int) -> Measurement | None:
    row = conn.execute(f"SELECT {COLUMNS} FROM measurements WHERE id = %s", (measurement_id,)).fetchone()  # noqa: S608 — a constant
    return to_measurement(row) if row else None


def list_measurements(conn: Connection, query: MeasurementQuery) -> list[Measurement]:
    """Closed interval start <= timestamp <= end; the conditions are the ones the
    (series_id, measured_at) index serves."""
    conditions: list[LiteralString] = []
    params: list[object] = []
    if query.series is not None:
        conditions.append("series_id = ANY(%s)")
        params.append(query.series)
    if query.start is not None:
        conditions.append("measured_at >= %s")
        params.append(query.start)
    if query.end is not None:
        conditions.append("measured_at <= %s")
        params.append(query.end)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    direction = "DESC" if query.sort == "-timestamp" else "ASC"
    params.append(query.limit)
    rows = conn.execute(
        f"SELECT {COLUMNS} FROM measurements {where} ORDER BY measured_at {direction}, id {direction} LIMIT %s",  # noqa: S608 — constants only
        params,
    ).fetchall()
    return [to_measurement(row) for row in rows]
