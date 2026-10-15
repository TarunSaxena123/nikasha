# Nikasha

**The touchstone for your trading strategy.** *Nikasha* (निकषा) is the touchstone goldsmiths used to test gold. This project tests Nifty 50 options strategies the same way: on past market data, explaining *why* a strategy worked or failed, not just whether it did.

It is an educational backtesting tool. It does not give advice, signals or recommendations.

## What Nikasha is

- **Three ways in:** pick a ready-made template, build a strategy step by step, or upload your written rules (PDF, Word, text) for an AI model to read.
- **Never guesses:** anything vague or missing becomes a question. Advanced options stay off unless you switch them on.
- **Explains the result, risk first:** drawdown and losing streaks before profit; results by year, month, India VIX level, trending or sideways days, weekday, expiry day, and calls vs puts.
- **Checks for overfitting:** compares the earlier tuning years with recent unseen years, and re-runs every test with India VIX 2 points lower and higher.
- **Stores nothing:** no accounts, no database, no logs of your content. Results live in your browser tab until you download the PDF or CSV.

How it is built: a static Next.js web app (Vercel), a Python engine on AWS Lambda (container image with the market data inside), and a small Python extraction function on AWS Lambda, the only part that calls an AI model (Anthropic's Claude). The full specification is in [`specs/`](specs/), the single source of truth; start with [`CLAUDE.md`](CLAUDE.md).

## Run it locally

Requirements: Python 3.12, Node.js 20 or later, about 1 GB of disk. No cloud account is needed.

```bash
# 1. Engine (port 8000)
cd engine
python3.12 -m venv .venv
.venv/bin/pip install -e ../pylib/nikasha_log -e ".[dev]"
.venv/bin/python scripts/csv_to_parquet.py          # builds engine/build/data/*.parquet from data/*.csv
.venv/bin/python -m nikasha_engine.adapters.http_app

# 2. Extraction function (port 8001) — in another terminal
cd extractor
python3.12 -m venv .venv
.venv/bin/pip install -e ../pylib/nikasha_log -e ".[dev]"
cp .env.example .env    # then put your ANTHROPIC_API_KEY in .env (live uploads only; never commit it)
.venv/bin/python -m nikasha_extractor.adapters.http_app
# Without a key, replay the recorded responses instead:
#   NIKASHA_EXTRACT_REPLAY=tests/recordings .venv/bin/python -m nikasha_extractor.adapters.http_app

# 3. Web app (port 3000) — in another terminal
cd web
npm ci
npm run dev
```

Open http://localhost:3000.

**Tests** (none of them call a paid service):

| Part | Command |
|---|---|
| Engine | `cd engine && .venv/bin/python -m pytest` (benchmarks: `-m perf tests/perf`) |
| Extraction function | `cd extractor && .venv/bin/python -m pytest` |
| Web unit tests | `cd web && npm test` |
| Web end-to-end | `cd web && npm run build && npx playwright test` |
| Contracts | `scripts/check-contracts.sh` |
| Repo checks | `node scripts/check-names.mjs && node scripts/sync-readme-disclaimer.mjs --check` |
| Privacy marker test | `scripts/privacy-marker-test.sh` |

## Deploy

Free tiers only; see [`specs/architecture.md`](specs/architecture.md) §5 and §10.

1. **AWS (engine and extraction).** Create an AWS budget alert first. Install the AWS SAM CLI and Docker. From the repo root:
   ```bash
   infra/build-extractor.sh
   cd infra
   export DOCKER_HOST=unix://$HOME/.docker/run/docker.sock   # Docker Desktop on macOS, so SAM finds Docker
   sam build
   sam deploy --guided --stack-name nikasha-prod \
     --parameter-overrides Stage=prod AllowedOrigin=https://<your-vercel-domain> BudgetEmail=<you@example.com> \
       EngineVersion=$(git rev-parse --short HEAD) AnthropicApiKey=<key>
   ```
   Region `ap-southeast-2` (Sydney; the Free plan account allows only this region). The key is a `NoEcho` parameter that reaches only the extraction function. Set an Anthropic monthly spend limit before the first live upload. The stack outputs `EngineUrl` and `ExtractUrl`.
2. **Vercel (web).** Import the GitHub repo, set the root directory to `web/`, and set `NEXT_PUBLIC_ENGINE_URL` and `NEXT_PUBLIC_EXTRACT_URL` to the two stack outputs. No analytics, no log drains. Security headers come from `web/vercel.json`.
3. Run the smoke tests and the checks in [`docs/release-checklist.md`](docs/release-checklist.md).

## Assumptions

- **Option prices are modelled, not real.** Black-Scholes with India VIX as the volatility, a 6.5% risk-free rate, prices rounded to the 0.05 tick. Each test also runs with VIX 2 points lower and higher.
- **Fills:** at the open of the minute after the signal candle; stop-loss and target checked every minute, stop first when both are hit in one minute; intraday square-off at 15:15; positions open at expiry settle at intrinsic value.
- **Strikes:** from the index level at the signal, rounded to 50 points.
- **Costs:** today's brokerage, STT, exchange, SEBI, stamp duty and GST rates, applied to the whole period, plus slippage. All shown, editable, and listed in every report.
- **Expiry calendar:** derived from the trading days in the data: Thursday expiries until August 2025, Tuesday from September 2025, holidays moved to the previous trading day.
- **Lot size:** one value for the whole backtest (pre-filled 65, confirmed by the user).

## Limitations

- No historical option prices: results for expiry-day trades and far-from-the-money strikes are the least reliable.
- The data is an unofficial public dataset (see the disclaimer), not an NSE feed; missing minutes are skipped, never filled.
- Charges changed over the years; only today's rates are modelled.
- Only Nifty 50 is included today.
- Nothing is saved: closing or refreshing the tab loses the result unless you downloaded it.

## Add an instrument

No engine code changes are needed (a test proves this with a second, synthetic instrument):

1. Add the 1-minute CSVs to `data/` (`datetime,open,high,low,close`; IST; one row per minute).
2. Add a profile `instruments/<symbol>.json` that validates against [`specs/contracts/instrument.schema.json`](specs/contracts/instrument.schema.json): session times, strike interval, tick size, lot-size pre-fill, dated expiry rules and extra trading days, volatility source, pricing parameters, default costs with sources, periods and report bands, data files.
3. Rebuild the Parquet files (`engine/scripts/csv_to_parquet.py`) and the engine image. The new instrument appears in `/v1/meta`.

## Disclaimer

<!-- DISCLAIMER:START -->
> **Disclaimer**
>
> Nikasha is an educational and research tool. It is provided solely to help users learn how trading strategies might have behaved on historical data.
>
> **Not SEBI-registered.** The creator of Nikasha is not registered with the Securities and Exchange Board of India (SEBI) as an Investment Adviser, Research Analyst or in any other capacity, and is not a stockbroker or financial planner.
>
> **Not investment advice.** Nothing on this platform, including reports, summaries, suggestions, templates and alternative strategies, is investment, financial, trading, tax or legal advice, or a recommendation or solicitation to buy, sell or hold any security, derivative or commodity. Suggestions describe how changes to hypothetical rules would have affected past simulated results; they are not trade recommendations.
>
> **Hypothetical results.** All results are simulated backtests on historical data. Option premiums are modelled, not actual market prices, and may differ materially from real prices. Backtests do not account for every real-world factor (including liquidity, slippage, order execution, margin requirements, and regulatory or market changes). Past or simulated performance does not guarantee future results.
>
> **Data source.** Historical Nifty 50 and India VIX 1-minute data covering 9 Jan 2015 to 14 May 2026 is taken from the publicly available Kaggle dataset "NSE - Nifty 50 Index Minute data (2015 to 2026)" (https://www.kaggle.com/datasets/debashis74017/nifty-50-minute-data). As stated by its uploader, this dataset was collected from various internet sources and is provided for research purposes only; it is not an official NSE data feed. Nikasha uses it solely for non-commercial, educational purposes. The data has not been independently verified and may contain errors, gaps or inaccuracies, and all results depend on it.
>
> **Trademarks.** NIFTY 50 and India VIX are trademarks of NSE Indices Limited / National Stock Exchange of India Limited. Nikasha is not affiliated with, endorsed by or sponsored by NSE, NSE Indices Limited or SEBI.
>
> **Your data and privacy.** Nikasha does not store your strategies, uploaded files, evaluation results, session data or any personal data on its servers. Uploaded files are processed in memory only and discarded once your strategy has been read. To read uploaded strategy text, it is sent to a third-party AI service (Anthropic), which, under its published policy for API use, automatically deletes inputs and outputs within 30 days, except where longer retention is needed to enforce its usage policy or comply with the law; do not upload personal or confidential information. Results exist only in your open browser tab until you download them. The only thing remembered is your acceptance of this disclaimer, stored in your own browser on your device.
>
> **High risk.** Trading in derivatives (futures and options) involves substantial risk and can result in losses exceeding your initial capital. Such trading is not suitable for everyone.
>
> **Your responsibility.** You are solely responsible for your trading and investment decisions and for any resulting profits or losses. Before trading, consult a SEBI-registered investment adviser or other qualified professional.
>
> **No liability.** To the maximum extent permitted by law, the creator and contributors of Nikasha accept no liability for any direct, indirect, incidental or consequential loss or damage, including trading losses or lost profits, arising from the use of, or reliance on, this platform or its outputs.
>
> **No warranty.** The platform, data and results are provided "as is" and "as available", without warranties of any kind, including accuracy, completeness, or fitness for a particular purpose.
>
> By using Nikasha, you acknowledge that you have read, understood and agreed to this disclaimer.
<!-- DISCLAIMER:END -->
