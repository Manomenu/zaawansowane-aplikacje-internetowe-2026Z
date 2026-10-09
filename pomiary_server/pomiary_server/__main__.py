import uvicorn

from pomiary_server.settings import settings

if __name__ == "__main__":
    uvicorn.run("pomiary_server.app:app", host=settings.host, port=settings.port, reload=False)
