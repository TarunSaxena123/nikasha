"""Error codes → HTTP status and plain-English messages for the extraction function."""

from __future__ import annotations

from typing import Any

MESSAGES: dict[str, tuple[int, str]] = {
    "BAD_REQUEST": (400, "Something went wrong sending your strategy. Please try again."),
    "PAYLOAD_TOO_LARGE": (413, "This is too large to send. Please use a file under 4 MB or shorter text."),
    "UNSUPPORTED_FILE": (
        415,
        "This file type isn't supported. Please use a PDF, Word (.docx) or text file, or paste the text.",
    ),
    "UNREADABLE_FILE": (
        422,
        "We couldn't read text from this file. It may be a scanned image or protected. Try pasting the text instead.",
    ),
    "EXTRACTION_FAILED": (422, "We couldn't read this strategy automatically. Try the guided builder or shorter text."),
    "EXTRACTION_BUSY": (503, "The reading service is busy right now. Please try again in a minute."),
}


class ExtractError(Exception):
    """A known failure, carrying only a code (never document content)."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


def error_body(code: str) -> dict[str, Any]:
    return {"error": {"code": code, "message": MESSAGES[code][1]}}


def status_of(code: str) -> int:
    return MESSAGES[code][0]
