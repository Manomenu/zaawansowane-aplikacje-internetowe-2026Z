"""Errors as Problem Details (RFC 9457) and the checks every request passes first.

Every error the API sends is `application/problem+json`: `type`, `title`, `status`, `detail`
and, for a rejected input, `errors: [{field, message}]`. Features raise `Unprocessable` (422)
or `Conflict` (409) for a rule of the domain; everything else (404, 405, 401, the validation
of the request itself) is handled here. An unexpected exception is logged and answered with a
bare 500 — never with a stack trace.

The middleware answers 406 and 415 before a route runs and puts the security headers on
every response.
"""

import logging
from collections.abc import Awaitable, Callable
from http import HTTPStatus
from typing import cast

from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

log = logging.getLogger("uvicorn.error")

PROBLEM_JSON = "application/problem+json"

# Every API response; the page's own CSP comes from nginx.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
}

# Swagger UI: an HTML page (so not JSON in Accept) that loads its script and styles from a CDN,
# which the strict policy above forbids. It carries no data, so it skips the Accept check and
# the CSP, and keeps the other headers.
DOCS_PATHS = {"/docs", "/docs/oauth2-redirect", "/redoc"}

# What a client may ask for in `Accept` and still be answered: we only speak JSON.
ACCEPTABLE = {"*/*", "application/*", "application/json", "application/problem+json"}


class FieldError(BaseModel):
    field: str
    message: str


class ProblemError(Exception):
    """A business-rule error a feature raises; `errors` says which fields are to blame."""

    status = HTTPStatus.INTERNAL_SERVER_ERROR

    def __init__(self, detail: str, errors: list[FieldError] | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        self.errors = errors


class Unprocessable(ProblemError):  # noqa: N818 — named after the status, like the HTTP phrase
    """The request is well formed but breaks a rule (422)."""

    status = HTTPStatus.UNPROCESSABLE_ENTITY


class Conflict(ProblemError):  # noqa: N818 — named after the status, like the HTTP phrase
    """The request clashes with what is stored (409)."""

    status = HTTPStatus.CONFLICT


def problem(status: int, detail: str, errors: list[FieldError] | None = None, headers: dict[str, str] | None = None) -> JSONResponse:
    body: dict[str, object] = {"type": "about:blank", "title": HTTPStatus(status).phrase, "status": status, "detail": detail}
    if errors:
        body["errors"] = [error.model_dump() for error in errors]
    return JSONResponse(body, status_code=status, media_type=PROBLEM_JSON, headers=headers)


# The handlers are registered for a specific exception class but typed with `Exception`, which
# is what Starlette's registry accepts; the cast restores the type the registry guarantees.
def http_error(_request: Request, exc: Exception) -> Response:
    error = cast("StarletteHTTPException", exc)
    return problem(error.status_code, str(error.detail), headers=dict(error.headers or {}))


def problem_error(_request: Request, exc: Exception) -> Response:
    error = cast("ProblemError", exc)
    return problem(error.status, error.detail, error.errors)


def invalid_request(_request: Request, exc: Exception) -> Response:
    errors = cast("RequestValidationError", exc).errors()
    if any(error["type"] == "json_invalid" for error in errors):
        return problem(400, "The request body is not valid JSON")
    # loc starts with where the value came from (body, query, ...); the client wants the rest.
    fields = [
        FieldError(field=".".join(str(part) for part in error["loc"][1:]) or str(error["loc"][0]), message=error["msg"]) for error in errors
    ]
    return problem(400, "The request is invalid", fields)


def unexpected_error(request: Request, _exc: Exception) -> Response:
    log.exception("unhandled error on %s %s", request.method, request.url.path)
    # This runs outside the middleware below, so the headers are added here.
    response = problem(500, "Internal server error")
    response.headers.update(SECURITY_HEADERS)
    return response


def accepts_json(accept: str) -> bool:
    """False when `Accept` is present and allows none of our media types (q=0 forbids one)."""
    if not accept.strip():
        return True
    for item in accept.split(","):
        media_type, *params = (part.strip().lower() for part in item.split(";"))
        refused = any(param.replace(" ", "") == "q=0" for param in params)
        if media_type in ACCEPTABLE and not refused:
            return True
    return False


def has_body(request: Request) -> bool:
    return request.headers.get("content-length", "0") != "0" or "transfer-encoding" in request.headers


async def check_request(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    docs = request.url.path in DOCS_PATHS
    if not docs and not accepts_json(request.headers.get("accept", "")):
        response = problem(406, "This API only produces application/json")
    elif (
        request.method in {"POST", "PUT"}
        and has_body(request)
        and request.headers.get("content-type", "").split(";")[0].strip().lower() != "application/json"
    ):
        response = problem(415, "The request body must be application/json")
    else:
        response = await call_next(request)
    response.headers.update(SECURITY_HEADERS)
    if docs:
        del response.headers["Content-Security-Policy"]
    return response


def install(app: FastAPI) -> None:
    """Call before adding CORS, so that CORS stays the outermost layer."""
    app.add_exception_handler(StarletteHTTPException, http_error)
    app.add_exception_handler(ProblemError, problem_error)
    app.add_exception_handler(RequestValidationError, invalid_request)
    app.add_exception_handler(Exception, unexpected_error)
    app.add_middleware(BaseHTTPMiddleware, dispatch=check_request)
