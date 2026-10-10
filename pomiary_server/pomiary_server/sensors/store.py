"""The SQL behind the sensor routes, and the lookup of a sensor by its API key.

A key is random (`secrets.token_urlsafe(32)`, 43 characters) and only its SHA-256 is stored,
so a copy of the database cannot be used to send measurements.
"""

import hashlib
import secrets
from datetime import datetime

from psycopg import Connection
from psycopg.errors import ForeignKeyViolation, UniqueViolation

from pomiary_server.problems import FieldError, Unprocessable
from pomiary_server.sensors.model import Sensor, SensorCreated, SensorInput

COLUMNS = "id, name, series_id, created_at, last_measurement_at"
NAME_INDEX = "sensors_name_unique"


def key_hash(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def to_sensor(row: tuple[int, str, int, datetime, datetime | None]) -> Sensor:
    return Sensor(id=row[0], name=row[1], series_id=row[2], created_at=row[3], last_measurement_at=row[4])


def list_sensors(conn: Connection) -> list[Sensor]:
    rows = conn.execute(f"SELECT {COLUMNS} FROM sensors ORDER BY id").fetchall()  # noqa: S608 — a constant
    return [to_sensor(row) for row in rows]


def find_sensor(conn: Connection, sensor_id: int) -> Sensor | None:
    row = conn.execute(f"SELECT {COLUMNS} FROM sensors WHERE id = %s", (sensor_id,)).fetchone()  # noqa: S608 — a constant
    return to_sensor(row) if row else None


def sensor_for_key(conn: Connection, key: str) -> Sensor | None:
    """The sensor a raw API key belongs to, or None."""
    row = conn.execute(f"SELECT {COLUMNS} FROM sensors WHERE api_key_hash = %s", (key_hash(key),)).fetchone()  # noqa: S608 — a constant
    return to_sensor(row) if row else None


def create_sensor(conn: Connection, data: SensorInput) -> SensorCreated:
    """Registers the sensor; Unprocessable when its series does not exist
    or the name is taken."""
    key = secrets.token_urlsafe(32)
    try:
        row = conn.execute(
            f"INSERT INTO sensors (name, series_id, api_key_hash) VALUES (%s, %s, %s) RETURNING {COLUMNS}",  # noqa: S608 — a constant
            (data.name, data.series_id, key_hash(key)),
        ).fetchone()
    except ForeignKeyViolation:
        conn.rollback()
        message = "No such series"
        raise Unprocessable(message, [FieldError(field="seriesId", message=message)]) from None
    except UniqueViolation as error:
        # The key hash is unique too; only a clash on the name is the client's doing.
        if error.diag.constraint_name != NAME_INDEX:
            raise
        conn.rollback()
        message = "A sensor with this name already exists"
        raise Unprocessable(message, [FieldError(field="name", message=message)]) from None
    # Committed here, like the other stores: the key must work as soon as the client has it.
    conn.commit()
    assert row is not None  # noqa: S101 — RETURNING always gives the row
    return SensorCreated(**to_sensor(row).model_dump(), api_key=key)


def delete_sensor(conn: Connection, sensor_id: int) -> bool:
    """Unregisters the sensor; its measurements stay (sensor_id becomes NULL)."""
    deleted = conn.execute("DELETE FROM sensors WHERE id = %s", (sensor_id,)).rowcount
    conn.commit()
    return deleted == 1
