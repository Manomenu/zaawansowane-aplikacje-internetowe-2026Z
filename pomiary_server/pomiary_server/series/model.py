"""What the series routes send and receive (docs/spec/zai-api-26z.yaml)."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

# Strict: `true` and `"5"` are not numbers (docs/design.md); NaN and infinity cannot be stored.
Number = Annotated[float, Field(strict=True, allow_inf_nan=False)]


class Camel(BaseModel):
    # The API speaks camelCase; the code keeps snake_case.
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SeriesInput(Camel):
    """min_value < max_value is a business rule (422), checked in the API, not here (400)."""

    name: str = Field(min_length=1, max_length=100)
    min_value: Number
    max_value: Number
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: str | None = None
    unit: str | None = Field(default=None, max_length=20)


class Series(SeriesInput):
    id: int
