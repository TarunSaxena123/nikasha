"""Error codes → HTTP status and plain-English messages (backend.md §6)."""

from __future__ import annotations

from typing import Any

MESSAGES: dict[str, tuple[int, str]] = {
    "BAD_REQUEST": (400, "Something went wrong sending your strategy. Please try again."),
    "PAYLOAD_TOO_LARGE": (413, "That request is too large. Please simplify the strategy and try again."),
    "VALIDATION_FAILED": (422, "Your strategy needs a few fixes before it can be evaluated."),
    "PERIOD_INVALID": (422, "The backtest period isn't available in the data."),
    "BUSY": (503, "Busy right now, please try again."),
    "ENGINE_ERROR": (500, "Something went wrong while evaluating. Please try again."),
}


class ApiError(Exception):
    """A known, user-facing failure. `problems` are already plain English."""

    def __init__(
        self,
        code: str,
        problems: list[dict[str, str]] | None = None,
        message: str | None = None,
        status: int | None = None,
    ) -> None:
        super().__init__(code)
        self.code = code
        self.problems = problems or []
        self.message = message
        self.status = status or MESSAGES[code][0]


def error_body(code: str, problems: list[dict[str, str]] | None = None, message: str | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {"code": code, "message": message or MESSAGES[code][1]}
    if problems:
        body["problems"] = problems
    return {"error": body}
