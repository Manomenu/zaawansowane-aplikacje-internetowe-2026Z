"""The SQL behind the series routes.

Deleting a series takes its sensors and measurements with it (ON DELETE CASCADE in the schema).
"""

from psycopg import Connection
from psycopg.errors import UniqueViolation

from pomiary_server.problems import Conflict, FieldError, Unprocessable
from pomiary_server.series.model import Series, SeriesInput

COLUMNS = "id, name, min_value, max_value, color, icon, unit"
NAME_INDEX = "series_name_unique"


def name_taken(conn: Connection) -> Unprocessable:
    """Rolls back the failed statement and builds the 422 for a name that is already used."""
    conn.rollback()
    message = "A series with this name already exists"
    return Unprocessable(message, [FieldError(field="name", message=message)])


def to_series(row: tuple[int, str, float, float, str, str | None, str | None]) -> Series:
    return Series(id=row[0], name=row[1], min_value=row[2], max_value=row[3], color=row[4], icon=row[5], unit=row[6])


def list_series(conn: Connection) -> list[Series]:
    rows = conn.execute(f"SELECT {COLUMNS} FROM series ORDER BY id").fetchall()  # noqa: S608 — a constant
    return [to_series(row) for row in rows]


def find_series(conn: Connection, series_id: int) -> Series | None:
    row = conn.execute(f"SELECT {COLUMNS} FROM series WHERE id = %s", (series_id,)).fetchone()  # noqa: S608 — a constant
    return to_series(row) if row else None


def create_series(conn: Connection, data: SeriesInput) -> Series:
    try:
        row = conn.execute(
            f"INSERT INTO series (name, min_value, max_value, color, icon, unit) VALUES (%s, %s, %s, %s, %s, %s) RETURNING {COLUMNS}",  # noqa: S608 — a constant
            (data.name, data.min_value, data.max_value, data.color, data.icon, data.unit),
        ).fetchone()
    except UniqueViolation as error:
        if error.diag.constraint_name != NAME_INDEX:
            raise
        raise name_taken(conn) from None
    # Committed here, not when the request's connection is returned: the answer must not
    # reach the client before the change is visible to its next request.
    conn.commit()
    assert row is not None  # noqa: S101 — RETURNING always gives the row
    return to_series(row)


def update_series(conn: Connection, series_id: int, data: SeriesInput) -> Series | None:
    """Replaces the series; None when it does not exist. Raises Conflict when the new range
    would leave a stored measurement outside it,
    Unprocessable when the name is taken."""
    # The row stays locked until the commit, so the check and the update see the same series.
    if conn.execute("SELECT 1 FROM series WHERE id = %s FOR UPDATE", (series_id,)).fetchone() is None:
        return None
    stored = conn.execute("SELECT min(value), max(value) FROM measurements WHERE series_id = %s", (series_id,)).fetchone()
    lowest, highest = stored or (None, None)
    if lowest is not None and highest is not None and (lowest < data.min_value or highest > data.max_value):
        conn.rollback()
        raise Conflict(f"The range must keep the stored measurements, which run from {lowest:g} to {highest:g}")
    try:
        row = conn.execute(
            "UPDATE series SET name = %s, min_value = %s, max_value = %s, color = %s, icon = %s, unit = %s "  # noqa: S608 — a constant
            f"WHERE id = %s RETURNING {COLUMNS}",
            (data.name, data.min_value, data.max_value, data.color, data.icon, data.unit, series_id),
        ).fetchone()
    except UniqueViolation as error:
        if error.diag.constraint_name != NAME_INDEX:
            raise
        raise name_taken(conn) from None
    conn.commit()
    return to_series(row) if row else None


def delete_series(conn: Connection, series_id: int) -> bool:
    deleted = conn.execute("DELETE FROM series WHERE id = %s", (series_id,)).rowcount
    conn.commit()
    return deleted == 1
