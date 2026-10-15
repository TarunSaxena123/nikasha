"""Transport-agnostic core: dispatch(method, path, body, content_type) → (status, body).

Wrapped like the engine (feature 07 design §2.2): known errors → their code; anything unexpected →
EXTRACTION_FAILED. Logs carry only technical fields; the document, its name and the model's output
never reach the logger. Nothing is written to disk or kept between requests.
"""

from __future__ import annotations

import json
import time
import uuid
from email.parser import BytesParser
from email.policy import HTTP
from typing import Any

from nikasha_extractor.convert import convert
from nikasha_extractor.core.errors import ExtractError, error_body, status_of
from nikasha_extractor.llm import ParseClient, extract_with_llm
from nikasha_extractor.reading import MAX_FILE_BYTES, check_text, read_upload
from nikasha_extractor.validate import validate_draft
from nikasha_log import log, log_exception

MAX_BODY = MAX_FILE_BYTES + 64 * 1024  # file + multipart overhead
ENDPOINT = "/v1/extract"

_client: ParseClient | None = None  # tests inject a recording client


def set_client(client: ParseClient | None) -> None:
    global _client
    _client = client


def file_bytes_from_multipart(body: bytes, content_type: str) -> bytes:
    """The 'file' part's bytes, parsed in memory. The part's file name is ignored (REQ-PRV-24)."""
    if "boundary=" not in content_type:
        raise ExtractError("BAD_REQUEST")
    msg = BytesParser(policy=HTTP).parsebytes(b"Content-Type: " + content_type.encode("latin-1") + b"\r\n\r\n" + body)
    if not msg.is_multipart():
        raise ExtractError("BAD_REQUEST")
    for part in msg.iter_parts():
        if part.get_param("name", header="content-disposition") == "file":
            payload = part.get_payload(decode=True)
            if isinstance(payload, bytes):
                return payload
    raise ExtractError("BAD_REQUEST")


def text_from_request(body: bytes, content_type: str) -> str:
    ct = content_type.lower()
    if ct.startswith("multipart/form-data"):
        return read_upload(file_bytes_from_multipart(body, content_type))
    if ct.startswith("application/json"):
        try:
            payload = json.loads(body)
        except (ValueError, UnicodeDecodeError) as exc:
            raise ExtractError("BAD_REQUEST") from exc
        if not isinstance(payload, dict) or set(payload) != {"text"} or not isinstance(payload["text"], str):
            raise ExtractError("BAD_REQUEST")
        return check_text(payload["text"])
    raise ExtractError("UNSUPPORTED_FILE")


def extract(text: str) -> dict[str, Any]:
    draft = validate_draft(extract_with_llm(text, _client))
    return convert(draft)


def dispatch(
    method: str, path: str, body: bytes | None, content_type: str = "", request_id: str | None = None
) -> tuple[int, Any]:
    rid = request_id or uuid.uuid4().hex[:16]
    started = time.perf_counter()
    endpoint = ENDPOINT if path == ENDPOINT else "other"
    try:
        if method != "POST" or path != ENDPOINT:
            status, out = 404, error_body("BAD_REQUEST")
            log("request", level="WARN", request_id=rid, endpoint=endpoint, status=404, code="BAD_REQUEST")
            return status, out
        if body is None or len(body) == 0:
            raise ExtractError("BAD_REQUEST")
        if len(body) > MAX_BODY:
            raise ExtractError("PAYLOAD_TOO_LARGE")
        text = text_from_request(body, content_type)
        result = extract(text)
        del text, body
    except ExtractError as err:
        log(
            "request",
            level="WARN",
            request_id=rid,
            endpoint=endpoint,
            status=status_of(err.code),
            code=err.code,
            duration_ms=round((time.perf_counter() - started) * 1000, 1),
        )
        return status_of(err.code), error_body(err.code)
    except Exception as exc:  # unexpected: type and code location only
        log_exception(exc, request_id=rid, endpoint=endpoint, code="EXTRACTION_FAILED")
        return 422, error_body("EXTRACTION_FAILED")
    log(
        "request",
        request_id=rid,
        endpoint=endpoint,
        status=200,
        count_items=len(result["items"]),
        duration_ms=round((time.perf_counter() - started) * 1000, 1),
    )
    return 200, result
