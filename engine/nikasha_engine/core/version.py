"""Engine version: the git commit SHA injected at image build (NIKASHA_ENGINE_VERSION), else 'dev'."""

from __future__ import annotations

import os
import subprocess
from functools import lru_cache

from nikasha_engine.core.paths import REPO_DIR


@lru_cache(maxsize=1)
def engine_version() -> str:
    env = os.environ.get("NIKASHA_ENGINE_VERSION")
    if env:
        return env
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], cwd=REPO_DIR, capture_output=True, text=True, timeout=5
        )
        sha = out.stdout.strip()
        return f"dev-{sha}" if sha else "dev"
    except (OSError, subprocess.SubprocessError):
        return "dev"
