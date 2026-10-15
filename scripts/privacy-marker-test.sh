#!/usr/bin/env bash
# Privacy marker test (feature 07 design §3.3; T-PRV-23, AC-PRV-16).
# Runs the engine and the extraction function locally (recorded LLM responses, no paid call), sends a
# strategy and an upload containing a unique marker, one invalid request and one forced exception, then
# fails if the marker appears anywhere in either function's output. (The browser-console part runs in
# the Playwright privacy spec.) Run from the repo root: scripts/privacy-marker-test.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MARK="NIKASHA-PRIVACY-MARKER-7f3a"
MARK_ID="nikasha_privacy_marker_7f3a"
LOGS="$(mktemp -d)"
EP=18100; XP=18101
cleanup() { kill "${E_PID:-0}" "${X_PID:-0}" 2>/dev/null || true; wait 2>/dev/null || true; rm -rf "$LOGS"; }
trap cleanup EXIT

(cd "$ROOT/engine" && NIKASHA_FAULT_INJECTION=1 NIKASHA_ENGINE_PORT=$EP .venv/bin/python -m nikasha_engine.adapters.http_app >"$LOGS/engine.log" 2>&1) &
E_PID=$!
(cd "$ROOT/extractor" && NIKASHA_EXTRACT_REPLAY=tests/recordings NIKASHA_EXTRACT_PORT=$XP .venv/bin/python -m nikasha_extractor.adapters.http_app >"$LOGS/extract.log" 2>&1) &
X_PID=$!
for i in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$EP/v1/meta" >/dev/null 2>&1 && curl -s -o /dev/null "http://127.0.0.1:$XP/v1/extract" -X OPTIONS && break
  sleep 1
done

STRATEGY=$(python3 - "$ROOT" "$MARK" "$MARK_ID" <<'PY'
import json, sys
root, mark, mark_id = sys.argv[1:]
s = json.load(open(f"{root}/specs/contracts/fixtures/strategies/valid/simple-trend-follower.json"))
s["name"] = f"My strategy {mark}"
s["indicators"][mark_id] = s["indicators"].pop("ema9")
for side in ("ce", "pe"):
    s["entry"][side]["left"]["ind"] = mark_id
costs = {k: v["value"] for k, v in json.load(open(f"{root}/instruments/nifty50.json"))["default_costs"]["items"].items()}
print(json.dumps({"strategy": s, "settings": {"period": {"start": "2024-01-01", "end": "2024-02-29"}, "costs": costs}}))
PY
)
INVALID=$(echo "$STRATEGY" | python3 -c 'import json,sys; d=json.load(sys.stdin); d["strategy"]["legs"][0]["strike"]={"method":"MONEYNESS","moneyness":"ITM","distance_pts":75}; print(json.dumps(d))')

code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }
c1=$(code -X POST -H 'content-type: application/json' --data "$STRATEGY" "http://127.0.0.1:$EP/v1/evaluate")
c2=$(code -X POST -H 'content-type: application/json' --data "$INVALID" "http://127.0.0.1:$EP/v1/evaluate")
c3=$(code -X POST -H 'content-type: application/json' --data "{\"marker\":\"$MARK\"}" "http://127.0.0.1:$EP/v1/__fault")
printf 'Buy ATM Nifty call when RSI 14 crosses above 60, stop-loss 30%%. %s\n' "$MARK" >"$LOGS/upload.txt"
c4=$(code -X POST -F "file=@$LOGS/upload.txt;filename=$MARK.txt" "http://127.0.0.1:$XP/v1/extract")
c5=$(code -X POST -H 'content-type: application/json' --data "{\"text\":\"$MARK plain text\"}" "http://127.0.0.1:$XP/v1/extract")
echo "responses: evaluate=$c1 invalid=$c2 fault=$c3 upload=$c4 paste=$c5"
[ "$c1" = 200 ] && [ "$c2" = 422 ] && [ "$c3" = 500 ] && [ "$c4" = 200 ] && [ "$c5" = 200 ] || { echo "unexpected responses"; exit 1; }
sleep 1
if grep -i -l -e "$MARK" -e "$MARK_ID" "$LOGS/engine.log" "$LOGS/extract.log"; then
  echo "PRIVACY MARKER FOUND IN LOGS"; exit 1
fi
lines=$(cat "$LOGS/engine.log" "$LOGS/extract.log" | wc -l | tr -d ' ')
echo "privacy marker test passed: marker absent from $lines log lines"
