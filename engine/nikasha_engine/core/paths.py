"""Where the engine finds its read-only inputs. Overridable by environment for the container image."""

from __future__ import annotations

import os
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = ENGINE_DIR.parent


def instruments_dir() -> Path:
    return Path(os.environ.get("NIKASHA_INSTRUMENTS_DIR", REPO_DIR / "instruments"))


def data_dir() -> Path:
    return Path(os.environ.get("NIKASHA_DATA_DIR", ENGINE_DIR / "build" / "data"))


def contracts_dir() -> Path:
    return Path(os.environ.get("NIKASHA_CONTRACTS_DIR", REPO_DIR / "specs" / "contracts"))
