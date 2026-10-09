"""What the auth routes send and receive (docs/spec/zai-api-26z.yaml)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Camel(BaseModel):
    # The API speaks camelCase; the code keeps snake_case.
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LoginRequest(Camel):
    username: str
    password: str


class LoginResponse(Camel):
    access_token: str
    token_type: Literal["Bearer"] = "Bearer"  # noqa: S105 — the name of the scheme, not a token
    expires_in: int


class PasswordChange(Camel):
    current_password: str
    new_password: str = Field(min_length=8)
