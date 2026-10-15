"""MANUAL, LIVE: checks that the wire schema still compiles as a structured output, and how much room
is left (feature 04 design §2.2). Run after any change to wire.py. Costs well under a cent: each
probe sends "x" and asks for one output token; a schema that is too large is rejected before the
model runs.

    cd extractor && .venv/bin/python scripts/check_schema_compiles.py

Measured 2026-10-15 (claude-sonnet-5-5): about 71 plain text fields fit in one schema. Weights of the
wire parts, in those units: conditions 14, basics 11, items ~16, exit 8, indicators 6, advanced
settings 4. The full WireDraft left room for 2–3 more fields.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    env = ROOT / "extractor" / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("ANTHROPIC_API_KEY is not set (put it in extractor/.env). Nothing was sent.")
        return 1
    import anthropic
    from pydantic import BaseModel, create_model

    from nikasha_extractor.llm import MODEL
    from nikasha_extractor.wire import WireDraft, _Strict

    client = anthropic.Anthropic(max_retries=0, timeout=120)

    def compiles(model: type[BaseModel]) -> bool:
        try:
            client.beta.messages.parse(
                model=MODEL, max_tokens=1, messages=[{"role": "user", "content": "x"}], output_format=model
            )
        except anthropic.BadRequestError as exc:
            if "too large" in str(exc) or "too complex" in str(exc):
                return False
            raise
        except Exception:  # noqa: BLE001 - compiled; the one-token reply just doesn't parse
            return True
        return True

    if not compiles(WireDraft):
        print("WireDraft does NOT compile: the schema is too large. Make it smaller before recording.")
        return 1
    lo, hi = 0, 40
    while lo < hi:  # how many extra plain text fields still fit
        mid = (lo + hi + 1) // 2
        extra = create_model(f"Extra{mid}", __base__=_Strict, **{f"x{i}": (str, ...) for i in range(mid)})
        probe = create_model(f"Probe{mid}", __base__=_Strict, wire=(WireDraft, ...), extra=(extra, ...))
        lo, hi = (mid, hi) if compiles(probe) else (lo, mid - 1)
    print(f"WireDraft compiles; room for about {lo} more fields.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
