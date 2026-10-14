# Feature 07 — Privacy and Legal: Design

Status: **Approved 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) (REQ-PRV-01…36) · Follows [`frontend.md`](../../frontend.md), [`backend.md`](../../backend.md), [`architecture.md`](../../architecture.md)

This feature is mostly **shared building blocks** that other features use: the disclaimer gate, the disclaimer texts and components, the consent store, the logging helper, and the privacy checks. Other features must use these blocks rather than re-implementing them.

---

## 1. Frontend

### 1.1 Route structure and the gate

Next.js App Router **route groups** separate open and gated pages:

```
web/src/app/
├── (open)/                     no gate (REQ-PRV-01)
│   ├── page.tsx                /            intro page (content: feature 05)
│   ├── disclaimer/page.tsx     /disclaimer
│   └── learn/…                 /learn, /learn/[slug]
├── (gated)/
│   ├── layout.tsx              <DisclaimerGate> wraps every gated page
│   ├── start/page.tsx          /start       (content: feature 05)
│   ├── templates/… build/… upload/… review/… evaluate/… report/…
└── layout.tsx                  app shell: header, <Footer> (short disclaimer)
```

**`<DisclaimerGate>`** (client component, in `(gated)/layout.tsx`):

```
mount ─► consent.read() ─┬─ accepted (current version) ─► render children
                         └─ not accepted ─► render <DisclaimerFull mode="gate"> only
                                              │
                         [Back to intro] ◄────┤ → router.push("/"), nothing stored (REQ-PRV-35)
                                              │
                         tick box + meta ready + [Continue]
                                              ▼
                              consent.accept() ─► re-render children (same URL)
```

- **No content before acceptance (REQ-PRV-05).** Until the consent check has run (first client render), the layout renders a neutral skeleton, never `children`. Gated pages are client-rendered, so their content is not in the server HTML. Children mount only after acceptance, so their data fetching and effects never start before it.
- **Return to the intended page (REQ-PRV-04).** The gate is drawn in place at the requested URL, so after acceptance the same route simply renders. **Get started** links to `/start`, which is gated, so first-time visitors see the gate there and land on `/start` afterwards. No redirect parameter is needed.
- **Continue enabled (REQ-PRV-03, 09)** only when the checkbox is ticked **and** `meta.status === "ready"`.
- **Meta failed (REQ-PRV-09, AC-PRV-20):** dates show "dates unavailable"; a **Try again** button calls `meta.reload()`.
- **Cross-tab (edge case):** the gate also listens to the `storage` event for `nikasha.disclaimer`, and re-checks on every gated route change.

### 1.2 Consent store — `web/src/legal/consent.ts`

```ts
const KEY = "nikasha.disclaimer";
export const DISCLAIMER_VERSION: string;          // build-time constant, §1.3

read():   "accepted" | "not-accepted"             // try/catch; parse; compare version
accept(): void                                    // try localStorage.setItem; on failure keep an
                                                  // in-memory flag for this page session (REQ-PRV-08)
```

- Stored value: `{ "accepted": true, "version": DISCLAIMER_VERSION }`. No timestamp is stored, so nothing can expire by time (REQ-PRV-36), and nothing else is stored (REQ-PRV-06).
- Any parse error or version mismatch → `"not-accepted"` (REQ-PRV-07).
- This is the **only** module in the web app allowed to touch `localStorage`. A lint rule (`no-restricted-globals` for `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`) enforces this everywhere else (REQ-PRV-21, 22).

### 1.3 Disclaimer texts — one source — `web/src/legal/disclaimer.ts`

- `FULL_DISCLAIMER`: structured blocks (heading + paragraphs) holding the exact §11.1 text, with `{firstDate}` / `{lastDate}` placeholders.
- `SHORT_DISCLAIMER`: the exact §11.2 text with the same placeholders.
- `fillDates(template, range | "loading" | "unavailable")`: replaces placeholders with formatted dates (`9 Jan 2015`), "loading dates…" or "dates unavailable" (REQ-PRV-09, 10, 15). It never falls back to a literal date.
- `DISCLAIMER_VERSION` = SHA-256 of the **unfilled** `FULL_DISCLAIMER` template, computed at build time. Date changes in the data do not force re-acceptance; text changes do (REQ-PRV-07).
- **Exact text check:** a unit test compares both templates with the blockquotes in `specs/product.md` §11.1 and §11.2 (placeholders normalised), so the app text can't drift from the approved spec.

### 1.4 Components

| Component | Used by | Behaviour | Req. |
|---|---|---|---|
| `DisclaimerFull` (`mode="gate" \| "page"`) | Gate; `/disclaimer` | Renders `FULL_DISCLAIMER` with dates from `useMeta()`. Gate mode adds the checkbox, Continue, Back to intro, Try again | 02–04, 09, 10, 17, 18, 35 |
| `DisclaimerShort` | Footer; report screen; each suggestion panel | Renders `SHORT_DISCLAIMER` with dates and a link to `/disclaimer` | 11, 12 |
| `Footer` | App shell (every page) | `DisclaimerShort` + links (Full disclaimer, Data source) + engine version | 11 |
| `DataSourceLine` | Intro page; report screen; downloads | "Data: Kaggle — NSE Nifty 50 Index Minute data (unofficial, not an NSE feed), {first}–{last}" from `meta.data_source` | 16 |
| `UploadPrivacyNotice` | Upload screen (feature 04), above every upload/paste control | Fixed text: the AI provider (Anthropic), up to 30 days retention under its API policy, "don't upload personal or confidential information", link to `/disclaimer` | 29 |

**For PDF/CSV** (built by feature 02), this feature provides pure functions so every download carries the same text:
- `pdfLegalBlocks(meta, period)` → short disclaimer (top of page 1 and every footer) + data source line (REQ-PRV-13, 16).
- `csvLegalPreamble(meta, period)` → `#`-prefixed comment lines: short disclaimer, data source, period (REQ-PRV-14, 16).

### 1.5 Meta loading — `useMeta()`

A single hook used by all legal components: `status: "loading" | "ready" | "error"`, `data`, `reload()`. It is fetched once per tab (`architecture.md` §3.1) and held in the `meta` store slice. It is needed on open pages too (intro, footer, `/disclaimer`), which is fine because `/v1/meta` carries no user content.

### 1.6 Browser privacy hardening

| Measure | Where | Req. |
|---|---|---|
| Lint ban on storage/cookie APIs outside `consent.ts` | ESLint config | 21, 22 |
| `no-console` lint rule + `compiler.removeConsole` in production builds | ESLint, `next.config` | 28 |
| Security headers via `vercel.json`: `Content-Security-Policy` (`default-src 'self'`; `connect-src 'self' <engine URL> <extract URL>`; `img-src 'self' data: blob:`; `font-src 'self'`; `frame-ancestors 'none'`), `Referrer-Policy: no-referrer`, `Permissions-Policy` (camera, microphone, geolocation off), `X-Content-Type-Options: nosniff` | `vercel.json` | 22, 23 |
| Fonts self-hosted via `next/font`; no third-party script tags | Code review + CSP | 22 |
| Upload `fetch` targets only `NEXT_PUBLIC_EXTRACT_URL`; strategy calls only `NEXT_PUBLIC_ENGINE_URL` (single API client module) | `web/src/api/client.ts` | 23 |

### 1.7 README disclaimer

`scripts/sync-readme-disclaimer.mjs` writes the full disclaimer into the README between `<!-- DISCLAIMER:START -->` and `<!-- DISCLAIMER:END -->`, filling the dates from the first and last timestamps of `data/nifty50_1min_clean.csv`. CI fails if running the script would change the README (REQ-PRV-10, 17, 18).

## 2. Backend

### 2.1 Shared logging helper — `pylib/nikasha_log/`

A small Python package installed into both the engine and the extraction function (path dependency), so the rules are written once.

```python
ALLOWED = {"ts", "level", "request_id", "endpoint", "status", "code", "duration_ms",
           "engine_version", "cold_start", "memory_mb", "count_trades", "count_items",
           "exc_type", "exc_where"}

def log(event: str, **fields) -> None
    # JSON line to stdout; unknown field → dropped (prod) / AssertionError (tests)   REQ-PRV-25
    # values must be int | float | bool | short enum-like str (≤ 64 chars, [A-Za-z0-9_.:/-]) — others dropped

def log_exception(exc: BaseException, *, request_id: str, endpoint: str) -> None
    # logs exc_type = type(exc).__name__ and exc_where = "file.py:line:function" frames
    # from the traceback; NEVER str(exc), args, or locals                              REQ-PRV-26
```

- `logging.basicConfig` is **not** used. Third-party loggers (`anthropic`, `httpx`, `botocore`, `urllib3`) are set to `WARNING`, and their handlers are removed, so they can't print request data.
- A lint rule bans `print(` and direct `logging.` calls in both packages, except inside `nikasha_log`.

### 2.2 Request wrapper (both functions)

`core/api.dispatch` wraps every request:

```
start timer → route
  ├─ validation error (jsonschema / pydantic / SEM) → 422 with plain-English problems
  │     log(event="request", status=422, code="VALIDATION_FAILED")      ← no problem details
  ├─ known error → mapped code/status, logged the same way
  ├─ unexpected exception → log_exception(...) → 500 ENGINE_ERROR / EXTRACTION_FAILED
  └─ success → log(event="request", status=200, duration_ms, count_*)
```

Bodies and responses never go near the logger (REQ-PRV-25, 26).

### 2.3 In-memory upload handling (extraction function)

- Lambda Function URL event → `base64.b64decode(event["body"])` → multipart parsed in memory (`python-multipart` streaming parser into `bytes`) → `io.BytesIO`.
- `pypdf.PdfReader(BytesIO)`, `docx.Document(BytesIO)`, `bytes.decode("utf-8")` read directly from memory. No `tempfile`, no `open(..., "w")` (REQ-PRV-20).
- The file name from the multipart headers is **ignored**: never read into variables passed onward, never logged, never sent (REQ-PRV-24).
- After the response is built, the handler deletes its references (`del data, text`); nothing is cached at module level.

### 2.4 What goes to the AI provider

`llm.py` builds the request from exactly two parts: the fixed system prompt (feature 04) and one user message containing **only the extracted text**. No metadata fields are sent. The `anthropic` client is created with default headers only (REQ-PRV-24).

### 2.5 Infrastructure (SAM template, `infra/template.yaml`)

| Item | Setting | Req. |
|---|---|---|
| `AWS::Logs::LogGroup` per function | `RetentionInDays: 1`; functions reference it via `LoggingConfig.LogGroup` | 27 |
| Function URL | `AuthType: NONE`; CORS origins = the Vercel production domain in prod, any origin (`*`) in the dev stage only (previews and localhost; `architecture.md` §3.2); no access logging exists for Function URLs and none is added | 27 |
| Storage resources | **None** declared: no S3, DynamoDB, RDS, EFS, ElastiCache, SQS. A CI test parses the template and fails if any storage resource type appears | 19 |
| Ephemeral storage | Default 512 MB `/tmp`, unused by design (tests in §5) | 20 |
| Secrets | `ANTHROPIC_API_KEY` as a `NoEcho` parameter → environment variable of the extraction function only | 24 |

### 2.6 Engine-generated wording (REQ-PRV-31–33)

The engine's summary and suggestion text comes only from **fixed templates** in `report/summary.py` and `suggestions/planner.py`, all written in past-simulated form ("would have", "in this backtest"). The same banned-phrase list as the web app (§3) is checked against these templates in engine tests.

## 3. Shared checks

### 3.1 Banned phrases
`specs/contracts/banned-phrases.txt` holds the banned list from `frontend.md` §13, one phrase per line, case-insensitive. Both test suites read this one file:
- Web: scans the UI copy catalogue (`web/src/copy/**`), the legal texts, and text extracted from generated PDFs/CSVs for the test strategies.
- Engine: scans the summary and suggestion templates and the `summary` array of golden reports.

### 3.2 Product names (REQ-PRV-34)
Writing competitor names into the repo would break the rule it enforces. So `specs/contracts/excluded-names.sha256` holds only **SHA-256 hashes** of lower-cased names. The owner maintains the plain list privately. `scripts/check-names.mjs` hashes every 1-, 2- and 3-word sequence in the app source, specs, docs and README and fails CI on a match.

### 3.3 Privacy marker test (AC-PRV-16)
An end-to-end script runs against the local stack (engine and extraction through their HTTP adapters, web in production mode):
1. Sends a strategy whose `name` and an indicator id contain `NIKASHA-PRIVACY-MARKER-7f3a`, plus one deliberately invalid copy (validation error).
2. Uploads a `.txt` containing the marker, using a recorded LLM response (no paid call).
3. Triggers a forced exception through a test-only fault-injection flag, which exists only in test builds.
4. Searches captured stdout/stderr of both functions and the browser console for the marker; any hit fails.

Before release, the same search is run once against CloudWatch for the deployed stack (manual checklist item).

## 4. Contract

**No new endpoints or schema fields.** This feature uses:
- `GET /v1/meta` → `instruments[].data_range` (dates for all disclaimers) and `instruments[].data_source` (name, URL, note). It is called without acceptance, because the intro page and footer need it. It carries no user content.
- `Error` model: `message` and `problems[].message` are shown to users in plain English. Their content is never logged (§2.2).
- `/v1/extract`: request carries only the file or text, with no user identifiers. The response echoes only short quotes (≤ 300 chars, already in the contract).

New shared contract files (test data, not API): `specs/contracts/banned-phrases.txt`, `specs/contracts/excluded-names.sha256`.

## 5. Error handling

| Situation | Behaviour | Req. |
|---|---|---|
| `localStorage` blocked or throws | In-memory acceptance for the page session; gate reappears next visit; no error shown | 08 |
| Stored value corrupt or old version | Treated as not accepted; overwritten on next acceptance | 07 |
| `/v1/meta` slow | "loading dates…", Continue disabled | 09 |
| `/v1/meta` fails | "dates unavailable", Try again; open pages still render | 09, 15 |
| Exception anywhere in a function | Logged as type + code location only; user sees a plain-English error | 26 |
| Multipart parsing fails | `BAD_REQUEST`, logged by code only | 25 |

## 6. Testing strategy

| AC | Test | Level / location |
|---|---|---|
| AC-PRV-01 | Open routes render without gate | Playwright `e2e/legal.gate.spec.ts` |
| AC-PRV-02, 03, 21 | Get started → gate → `/start`; direct `/build` → gate → `/build` with no builder DOM before acceptance; Back to intro → `/`, nothing stored | Playwright |
| AC-PRV-04 | Continue disabled until ticked and meta ready | Component test (Vitest + Testing Library) |
| AC-PRV-05, 06, 07, 22 | `consent.ts`: write/read, version mismatch, corrupt JSON, throwing storage, fake clock +1 year | Unit |
| AC-PRV-08, 20 | Dates from mocked meta: ready / loading / error + Try again | Component + Playwright with mocked engine |
| AC-PRV-09 | Footer short disclaimer on every route | Playwright, iterating the route list |
| AC-PRV-10 | Report and suggestion panel show disclaimer and data source; PDF text extraction and CSV preamble contain them | Playwright + unit tests for `pdfLegalBlocks` / `csvLegalPreamble` |
| AC-PRV-11 | `/disclaimer` content; README sync check | Playwright + CI script |
| AC-PRV-12 | No `/tmp` writes (pytest monkeypatches `open`, `tempfile`, `os.open` to fail on write; `/tmp` listing before/after); SAM template has no storage resources; retention = 1 | pytest (extractor, engine) + template test |
| AC-PRV-13, 14 | After a full flow: cookies, storage keys and every network request inspected (domains and which requests carry bodies) | Playwright (request interception) |
| AC-PRV-15 | Recorded Anthropic client stub captures the request; assert only the text and the system prompt are present, and the file name is absent | pytest (extractor) |
| AC-PRV-16 | Privacy marker test (§3.3) | E2E script in CI |
| AC-PRV-17 | Upload notice visible before controls are usable | Playwright |
| AC-PRV-18 | Banned-phrase scans (§3.1); past-tense check on suggestion templates | Vitest + pytest |
| AC-PRV-19 | Hashed name scan (§3.2) | CI script |
| Text drift | App disclaimer templates equal `product.md` §11.1/§11.2 | Unit |
| Logging helper | Unknown fields rejected; exception logging has no message text | pytest (`pylib/nikasha_log`) |

All tests run locally and in CI with **no paid service calls** (`architecture.md` §10).

## 7. Consistency check

Checked against `constitution.md` (§3, §4, §5, §6, §8, §9), `product.md` §6.5, §11, §12, `architecture.md` §3.2, §4.3, §5.2, §7, §10, `frontend.md` §2–§4, §13, §14, `backend.md` §7, §9, and `contracts/api.openapi.yaml`. No contradictions found. Points aligned while writing:
- The `consent.ts` single-storage-module rule implements `frontend.md` §4 ("the only persistent value").
- The README disclaimer gets real dates via a sync script, because a static README can't read `/v1/meta`.
- The product-name check uses hashes, so the check itself never puts a competitor's name in the repo (constitution §9).
