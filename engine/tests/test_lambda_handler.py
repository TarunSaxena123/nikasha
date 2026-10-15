"""T-ENG-16 (local part): the Lambda adapter maps Function URL events to the core."""

from __future__ import annotations

import base64
import json

import pytest


@pytest.mark.realdata
def test_function_url_events(real_md):
    from nikasha_engine.adapters.lambda_handler import handler

    out = handler({"rawPath": "/v1/meta", "requestContext": {"http": {"method": "GET"}, "requestId": "r1"}}, None)
    assert out["statusCode"] == 200 and json.loads(out["body"])["instruments"][0]["symbol"] == "NIFTY50"
    bad = base64.b64encode(b"{oops").decode()
    out = handler(
        {
            "rawPath": "/v1/evaluate",
            "body": bad,
            "isBase64Encoded": True,
            "requestContext": {"http": {"method": "POST"}},
        },
        None,
    )
    assert out["statusCode"] == 400
