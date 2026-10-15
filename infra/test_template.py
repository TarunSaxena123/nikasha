"""T-PRV-10 (AC-PRV-12): log retention 1 day, no storage resources, the key only on the extraction function."""

from __future__ import annotations

from pathlib import Path

import yaml


class Loader(yaml.SafeLoader):
    pass


def _tag(loader, suffix, node):  # CloudFormation short tags (!Ref, !Sub, …) as plain values
    if isinstance(node, yaml.ScalarNode):
        return {suffix: loader.construct_scalar(node)}
    if isinstance(node, yaml.SequenceNode):
        return {suffix: loader.construct_sequence(node)}
    return {suffix: loader.construct_mapping(node)}


Loader.add_multi_constructor("!", _tag)
T = yaml.load((Path(__file__).parent / "template.yaml").read_text(), Loader=Loader)
R = T["Resources"]
STORAGE = ("AWS::S3::", "AWS::DynamoDB::", "AWS::RDS::", "AWS::EFS::", "AWS::ElastiCache::", "AWS::SQS::",
           "AWS::SecretsManager::", "AWS::ApiGateway", "AWS::EC2::")


def test_log_retention_one_day():
    groups = [r for r in R.values() if r["Type"] == "AWS::Logs::LogGroup"]
    assert len(groups) == 2 and all(g["Properties"]["RetentionInDays"] == 1 for g in groups)
    for fn in ("EngineFunction", "ExtractFunction"):
        assert "LogGroup" in R[fn]["Properties"]["LoggingConfig"]


def test_no_storage_or_paid_resources():
    assert not [r["Type"] for r in R.values() if r["Type"].startswith(STORAGE)]


def test_key_only_on_extraction_function():
    assert T["Parameters"]["AnthropicApiKey"]["NoEcho"] is True
    assert "ANTHROPIC_API_KEY" in R["ExtractFunction"]["Properties"]["Environment"]["Variables"]
    engine_env = R["EngineFunction"]["Properties"].get("Environment", {}).get("Variables", {})
    assert not [k for k in engine_env if "ANTHROPIC" in k]


def test_function_urls_and_budget():
    for fn in ("EngineFunction", "ExtractFunction"):
        url = R[fn]["Properties"]["FunctionUrlConfig"]
        assert url["AuthType"] == "NONE" and url["InvokeMode"] == "BUFFERED"
    assert any(r["Type"] == "AWS::Budgets::Budget" for r in R.values())
