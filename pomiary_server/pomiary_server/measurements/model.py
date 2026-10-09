"""What the measurement routes send and receive (docs/spec/zai-api-26z.yaml)."""

from dataclasses import dataclass
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BeforeValidator

from pomiary_server.series.model import Camel, Number


def iso_datetime(value: object) -> datetime:
    """An ISO 8601 string with its offset (`Z` or `+02:00`). A string without one, and a number
    (pydantic would take it for a Unix time), are refused: a guessed zone is a wrong instant."""
    if not isinstance(value, str):
        message = "must be an ISO 8601 date-time string"
        raise ValueError(message)  # noqa: TRY004 — pydantic turns only ValueError into a validation error
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        message = "must be an ISO 8601 date-time"
        raise ValueError(message) from None
    if parsed.tzinfo is None:
        message = "must include a timezone offset, such as Z or +02:00"
        raise ValueError(message)
    return parsed


Timestamp = Annotated[datetime, BeforeValidator(iso_datetime)]


class MeasurementInput(Camel):
    """The series is not in the body: it comes from the sensor's key."""

    value: Number
    timestamp: Timestamp | None = None


class Measurement(Camel):
    id: int
    series_id: int
    sensor_id: int | None
    value: float
    timestamp: datetime


@dataclass(frozen=True)
class MeasurementQuery:
    """What `GET /measurements` asks for; `series` None means all of them."""

    series: list[int] | None
    start: datetime | None
    end: datetime | None
    sort: Literal["timestamp", "-timestamp"]
    limit: int
