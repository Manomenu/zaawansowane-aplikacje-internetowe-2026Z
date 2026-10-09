import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pomiary_server import db, problems
from pomiary_server.auth import api as auth_api
from pomiary_server.auth import store as auth_store
from pomiary_server.settings import settings

# Routes are declared without an /api prefix. The prefix belongs to the edge — the vite
# proxy in development, nginx in the image — which strips it before the request lands here.
# uvicorn configures its own logger, so messages here show up next to its startup lines.
log = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    # Without the database there is nothing to serve, so the server fails to start with a
    # clear error rather than failing every request later.
    db.pool.open(wait=True, timeout=10)
    with db.pool.connection() as conn:
        for name in db.migrate(conn):
            log.info("applied migration %s", name)
        if (
            settings.admin_username
            and settings.admin_password
            and auth_store.bootstrap_admin(conn, settings.admin_username, settings.admin_password)
        ):
            log.info("created the first administrator %s", settings.admin_username)
    yield
    db.pool.close()


app = FastAPI(title="pomiary", version="0.1.0", lifespan=lifespan)

problems.install(app)

# After problems.install: the last middleware added is the outermost, and CORS has to answer
# a preflight before anything else looks at the request.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Health(BaseModel):
    status: str


# Touches nothing outside the process, so it doubles as the cluster's liveness probe.
@app.get("/health")
def health() -> Health:
    return Health(status="ok")


# Features add their routers here: app.include_router(notes) — and a layer in pyproject.toml.
app.include_router(auth_api.router)
