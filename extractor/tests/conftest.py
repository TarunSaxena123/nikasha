from __future__ import annotations

import pytest

import nikasha_log
from helpers import RECORDINGS
from nikasha_extractor.core import api
from nikasha_extractor.replay import ReplayClient

nikasha_log.STRICT = True


@pytest.fixture()
def replay():
    client = ReplayClient(RECORDINGS)
    api.set_client(client)
    yield client
    api.set_client(None)
