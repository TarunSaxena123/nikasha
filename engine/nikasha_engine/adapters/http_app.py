"""Local / non-Lambda HTTP adapter (ASGI): HTTP request ↔ core.api.dispatch.

Run: python -m nikasha_engine.adapters.http_app   (port 8000; NIKASHA_ENGINE_PORT to change)
CORS allows any origin here: this adapter is for local development only (architecture.md §5.4).
"""

from __future__ import annotations

import json
import os

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Route

from nikasha_engine.core import api

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "600",
}


async def handle(request: Request) -> Response:
    if request.method == "OPTIONS":
        return Response(status_code=204, headers=CORS)
    body = await request.body()
    status, out = api.dispatch(request.method, request.url.path, body)
    return Response(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")),
        status_code=status,
        media_type="application/json",
        headers=CORS,
    )


app = Starlette(routes=[Route("/{path:path}", handle, methods=["GET", "POST", "OPTIONS"])])


def main() -> None:
    import uvicorn

    api.init()
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=int(os.environ.get("NIKASHA_ENGINE_PORT", "8000")),
        access_log=False,
        log_level="warning",
    )


if __name__ == "__main__":
    main()
