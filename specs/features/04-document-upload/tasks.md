# Feature 04 — Document Upload: Tasks

Status: **Approved under delegation 2026-10-14** · Created 2026-10-14 · Implements [`requirements.md`](requirements.md) via [`design.md`](design.md)

Rules: [CONTRACT] first, then [BE] and [FE] independently. **Build step 7** (`product.md` §15) unless noted. **Done** = code, passing tests, `traceability.md` updated. **No automated test calls the AI provider**; recordings are made manually. Depends on feature 07 (T-PRV-07/08/09/10/17), feature 03's completeness module (T-INP-02, built in step 6) and feature 02 (review screen, PDF).

## Contract tasks

| ID | Task | Req. | Tests that prove it |
|---|---|---|---|
| T-UPL-01 | [CONTRACT] Extraction fixtures `specs/contracts/fixtures/extraction/`: `ExtractionResult` JSON for both samples (produced by `convert.py` from the recordings) plus a no-rules case and a VWAP case; each validates against `api.openapi.yaml` (incl. `number.targets`) | 05, 09, 16, 18 | Contract test validates all fixtures; web tests consume them |

## Backend tasks (extraction function)

| ID | Task | Req. | Tests that prove it |
|---|---|---|---|
| T-UPL-02 | [BE] `extractor/` scaffold: package layout, pyproject, ruff/mypy/pytest, `nikasha_log`, request wrapper (with T-PRV-07), HTTP adapter (local :8001) and Lambda adapter; zip build; SAM function (with T-PRV-10) | — (enables) | CI lint/types/tests; local smoke call |
| T-UPL-03 | [BE] `reading.py`: PDF (pypdf), DOCX (python-docx, paragraphs + tables), TXT (UTF-8); type sniffed from bytes; empty/scanned/protected → `UNREADABLE_FILE`; other types → `UNSUPPORTED_FILE` (with T-PRV-08 in-memory rules) | 04 | AC-UPL-03; fixtures per file type |
| T-UPL-04 | [BE] `ExtractionDraft` pydantic models (design §2.2) and `validate.py` (stripped constraints, id/parent consistency) | 05, 10 | Unit tests incl. invalid parent references and over-long quotes |
| T-UPL-05 | [BE] `prompt.py` (design §2.4) with `PROMPT_VERSION`; prompt text reviewed against the constitution (never guess, data-not-instructions) | 05–09 | Prompt snapshot test (changes require a version bump) |
| T-UPL-06 | [BE] `llm.py`: `messages.parse` call with model, effort, max_tokens, timeout, retries, fallback; stop-reason and error mapping (with T-PRV-09 text-only payload) | 05, 10 | pytest with a stub client: refusal / max_tokens → `EXTRACTION_FAILED`; rate limit → `EXTRACTION_BUSY`; payload contents |
| T-UPL-07 | [BE] `convert.py`: tree assembly, option-side → legs, null dropping, pending `state_or_turns`, FieldKey → JSON Pointer table, options → patches, NUMBER `targets` with multipliers, label trimming and banned-phrase fallback | 06, 08, 09, 10 | AC-UPL-04, 05, 06 (with recordings); unit tests per FieldKey |
| T-UPL-08 | [BE] `scripts/record_extraction.py` (manual, live) + recordings for both samples + oracle tests replaying them against design §2.5 | 20, 21 | AC-UPL-15, AC-UPL-07 (server part) |

## Frontend tasks

| ID | Task | Req. | Tests that prove it |
|---|---|---|---|
| T-UPL-09 | [FE] Upload input screen: privacy notice (T-PRV-17), file/paste tabs, client-side checks, submit via the API client | 01, 02, 03 | AC-UPL-01 (component) |
| T-UPL-10 | [FE] Waiting view with Cancel; stale-response handling | 03 | AC-UPL-02 (Playwright, mocked extract) |
| T-UPL-11 | [FE] Results screen: merge server items with completeness MISSING items; three groups with quotes; ignored-text note; no-rules state | 11, 12, 18 | AC-UPL-08, AC-UPL-14 (no-rules) |
| T-UPL-12 | [FE] Question stepper: order, progress, Back (re-apply from original), CHOICE/NUMBER/TIME/CONFIRM, patch application (`fast-json-patch`), re-run completeness after the last answer; no evaluate control until done | 13, 14, 15 | AC-UPL-09, 10, 11, AC-UPL-07 (web part) |
| T-UPL-13 | [FE] Unsupported acknowledgement; `draft.leftOut[]`; shown on review and in the PDF (with feature 02 T-EVL-01, T-RPT-17) | 16 | AC-UPL-12 |
| T-UPL-14 | [FE] Hand-off to review (origin UPLOAD, confirmations per REQ-UPL-17) | 17 | AC-UPL-13 |
| T-UPL-15 | [FE] Error messages for every code and network failure (design §1.7) | 19 | AC-UPL-14 |
| T-UPL-16 | [BE] Prompt `upl-3`, wire choices and conversion for the extensions; live recording of the ORB + CPR sample | UPL-22, 23 | AC-UPL-16 (replay) | 11 (added 2026-10-15) |

## Order of work (step 7)

```
T-UPL-02 → T-UPL-03, 04, 05 → T-UPL-06 → T-UPL-07 → T-UPL-08 → T-UPL-01
T-UPL-09, 10 → T-UPL-11 → T-UPL-12 → T-UPL-13, 14, 15     (web side can start on T-UPL-01 fixtures)
```
