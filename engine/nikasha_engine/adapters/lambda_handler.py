"""AWS Lambda Function URL adapter: event ↔ core.api.dispatch (architecture.md §5.3).

CORS is configured on the Function URL itself (SAM template), so this handler adds no CORS headers.
Data and profiles are loaded during the init phase (module import), once per container.
"""

from __future__ import annotations

import base64
import json
from typing import Any

from nikasha_engine.core import api

api.init()


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    http = (event.get("requestContext") or {}).get("http") or {}
    method = str(http.get("method", "GET")).upper()
    path = str(event.get("rawPath") or "/")
    raw = event.get("body")
    body: bytes | None = None
    if raw is not None:
        body = base64.b64decode(raw) if event.get("isBase64Encoded") else str(raw).encode("utf-8")
    request_id = str((event.get("requestContext") or {}).get("requestId") or getattr(context, "aws_request_id", ""))
    status, out = api.dispatch(method, path, body, request_id=request_id[:64] or None)
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(out, ensure_ascii=False, separators=(",", ":")),
    }
