"""What the sensor routes send and receive (docs/spec/zai-api-26z.yaml)."""

from datetime import datetime
from typing import Annotated

from pydantic import Field

from pomiary_server.series.model import Camel

# Capped at bigint, so a huge id is a 400 and not a database error.
Id = Annotated[int, Field(strict=True, ge=1, le=2**63 - 1)]


class SensorInput(Camel):
    name: str = Field(min_length=1, max_length=100)
    series_id: Id


class Sensor(Camel):
    """Never carries the key or its hash."""

    id: int
    name: str
    series_id: int
    created_at: datetime
    last_measurement_at: datetime | None


class SensorCreated(Sensor):
    """The answer to the registration: the only place the key is ever sent."""

    api_key: str
