"""AWS Lambda Function URL adapter for the extraction function. CORS is set on the Function URL."""

from __future__ import annotations

import base64
import json
from typing import Any

from nikasha_extractor.core import api


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    http = (event.get("requestContext") or {}).get("http") or {}
    headers = {str(k).lower(): str(v) for k, v in (event.get("headers") or {}).items()}
    raw = event.get("body")
    body: bytes | None = None
    if raw is not None:
        body = base64.b64decode(raw) if event.get("isBase64Encoded") else str(raw).encode("utf-8")
    rid = str((event.get("requestContext") or {}).get("requestId") or getattr(context, "aws_request_id", ""))[:64]
    status, out = api.dispatch(
        str(http.get("method", "POST")).upper(),
        str(event.get("rawPath") or "/"),
        body,
        headers.get("content-type", ""),
        request_id=rid or None,
    )
    del body, raw
    return {
        "statusCode": status,
        "headers": {"content-type": "application/json"},
        "body": json.dumps(out, ensure_ascii=False, separators=(",", ":")),
    }
