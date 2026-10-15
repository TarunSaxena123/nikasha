"""Local HTTP adapter (ASGI) for the extraction function: port 8001.

Run: python -m nikasha_extractor.adapters.http_app   (needs ANTHROPIC_API_KEY in extractor/.env for live calls)
NIKASHA_EXTRACT_REPLAY=<recordings dir> replays recorded LLM responses instead (tests, privacy E2E; no paid call).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Route

from nikasha_extractor.core import api

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "600",
}


async def handle(request: Request) -> Response:
    if request.method == "OPTIONS":
        return Response(status_code=204, headers=CORS)
    body = await request.body()
    status, out = api.dispatch(request.method, request.url.path, body, request.headers.get("content-type", ""))
    return Response(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")),
        status_code=status,
        media_type="application/json",
        headers=CORS,
    )


app = Starlette(routes=[Route("/{path:path}", handle, methods=["GET", "POST", "OPTIONS"])])


def _load_env() -> None:
    env = Path(__file__).resolve().parents[2] / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def main() -> None:
    import uvicorn

    _load_env()
    replay = os.environ.get("NIKASHA_EXTRACT_REPLAY")
    if replay:
        from nikasha_extractor.replay import ReplayClient

        api.set_client(ReplayClient(Path(replay)))
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=int(os.environ.get("NIKASHA_EXTRACT_PORT", "8001")),
        access_log=False,
        log_level="warning",
    )


if __name__ == "__main__":
    main()
