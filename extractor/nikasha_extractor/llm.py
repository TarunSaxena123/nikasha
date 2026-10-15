"""The one LLM call (backend.md §9.2; feature 04 design §2.1; feature 07 design §2.4).

The request carries exactly two things: the fixed system prompt and one user message with the
extracted text. No file name, no metadata, no user details. Structured output guarantees the
reply matches ExtractionDraft; refusals and truncation become EXTRACTION_FAILED (never partial
output); rate limits, server errors and connection problems become EXTRACTION_BUSY.
"""

from __future__ import annotations

from typing import Any, Protocol

import anthropic

from nikasha_extractor.core.errors import ExtractError
from nikasha_extractor.prompt import SYSTEM_PROMPT
from nikasha_extractor.schema import ExtractionDraft

MODEL = "claude-sonnet-5-5"  # owner's choice (backend.md §9.2)
MAX_TOKENS = 16_000
TIMEOUT_S = 50.0
MAX_RETRIES = 1
EFFORT = "medium"
FALLBACK_BETA = "server-side-fallback-2026-07-01"


class ParseClient(Protocol):
    """The slice of the SDK client this module uses (tests pass a recording stub)."""

    @property
    def beta(self) -> Any: ...


def make_client() -> anthropic.Anthropic:
    # Default headers only; the key comes from ANTHROPIC_API_KEY in the function's environment.
    return anthropic.Anthropic(timeout=TIMEOUT_S, max_retries=MAX_RETRIES)


def build_request(text: str) -> dict[str, Any]:
    """Keyword arguments for messages.parse: the system prompt and the text, nothing else."""
    return {
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": text}],
        "output_format": ExtractionDraft,
        "output_config": {"effort": EFFORT},
        "betas": [FALLBACK_BETA],
        "fallbacks": "default",
    }


def extract_with_llm(text: str, client: ParseClient | None = None) -> ExtractionDraft:
    c = client or make_client()
    try:
        response = c.beta.messages.parse(**build_request(text))
    except anthropic.RateLimitError as exc:
        raise ExtractError("EXTRACTION_BUSY") from exc
    except anthropic.InternalServerError as exc:
        raise ExtractError("EXTRACTION_BUSY") from exc
    except anthropic.APIStatusError as exc:
        if exc.status_code in (429, 503, 529) or exc.status_code >= 500:
            raise ExtractError("EXTRACTION_BUSY") from exc
        raise ExtractError("EXTRACTION_FAILED") from exc
    except anthropic.APIConnectionError as exc:  # includes timeouts
        raise ExtractError("EXTRACTION_BUSY") from exc
    except anthropic.APIError as exc:
        raise ExtractError("EXTRACTION_FAILED") from exc
    except ValueError as exc:  # the reply didn't parse into the schema
        raise ExtractError("EXTRACTION_FAILED") from exc
    # Check the stop reason before reading content: a refusal or truncation is never used.
    if getattr(response, "stop_reason", None) in ("refusal", "max_tokens"):
        raise ExtractError("EXTRACTION_FAILED")
    parsed = getattr(response, "parsed_output", None)
    if not isinstance(parsed, ExtractionDraft):
        raise ExtractError("EXTRACTION_FAILED")
    return parsed
