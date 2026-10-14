# Nikasha — Constitution

Status: **Approved 2026-10-14** · Created 2026-10-14

These principles are non-negotiable. Every requirement, design, contract, task, line of code and line of UI copy must obey them. If any spec contradicts this file, this file wins, and the conflicting spec is a defect to be fixed through the change process (principle 1).

## Precedence

1. `constitution.md` (this file)
2. `product.md`
3. `architecture.md`, `frontend.md`, `backend.md`, `contracts/`
4. `features/*/requirements.md` → `design.md` → `tasks.md`

A lower document may add detail but never relax a higher one. `NIKASHA_BRIEF.md` is historical input only; once these specs are approved it is not consulted to decide behaviour.

## Principles

### 1. Spec first
Any change in behaviour (what the user sees or what the system does) updates the spec before the code, following the change process in `product.md` §14. Bug fixes (code not matching an existing requirement) and refactors, typos or styling with no behaviour change need no spec change. Every spec change is recorded in `CHANGELOG.md` before the related code change.

### 2. Never guess
Missing mandatory inputs and vague rules are always asked; nothing is invented. "Vague" includes ranges where one value is needed ("30–35"), unquantified words ("decisively", "significantly") and terms whose meaning changed over the data period ("Thursday" for expiry day). Text that is not a trading rule is ignored, not asked about. A strategy is never evaluated while any question is unanswered.

### 3. No hidden defaults
Advanced options are OFF unless the user explicitly sets them. Nothing is pre-filled for an advanced option. The only pre-filled values are the ones `product.md` names (number of lots, lot size, transaction costs, backtest period), and they are always shown for the user to confirm or edit before evaluation. Every report lists the settings used and every advanced option that was off.

### 4. No technical exposure
Users never see JSON, code, schemas, stack traces or internal identifiers anywhere: screens, errors, reports, downloads. Rules are shown in plain English; errors are shown in plain English with what to do next.

### 5. Zero data storage
No strategies, uploaded files, results, sessions or personal data are stored or logged on any server. Uploaded files are processed in memory and discarded after extraction. Logs hold technical errors only, never request bodies or user content. There are no accounts, no database, no analytics and no tracking cookies. The only thing kept anywhere is the disclaimer-acceptance flag, in the user's own browser.

### 6. Honesty
Every report discloses that option premiums are modelled, not actual; the data source and its actual date range (read from the data, never hardcoded); the data gaps skipped in the tested period; the settings used; and any rule that had no effect (for example, a sizing reduction absorbed by the 1-lot minimum). The disclaimer appears everywhere `product.md` §11 specifies. Privacy text accurately states that uploaded strategy text is sent to a third-party AI provider and quotes that provider's retention policy correctly.

### 7. No fabricated data
Missing market data is never filled with copied, interpolated or estimated prices. If an input needed to price an option is missing at a minute, nothing is evaluated at that minute. Modelled option premiums are the single, disclosed exception: they are computed by a stated model from real spot and volatility data, never invented to fill a gap.

### 8. Educational, not advisory
No live signals, no "buy now / sell now" messages, no profit promises, no ranking of strategies as "best to trade". Suggestions describe past simulated results ("this change would have…"), never what the user should do.

### 9. No product names
Other products, platforms or services that compete with Nikasha are never named in the app, specs, docs or README. (Data and infrastructure providers that must be credited or disclosed — the data source, the exchange as trademark owner, the hosting providers and the AI provider — are not competitors and are named where honesty or law requires it.)

### 10. Instrument-agnostic
Engine code contains no instrument-specific logic: no hardcoded symbols, session hours, strike intervals, expiry weekdays, lot sizes, cost rates, volatility sources or file paths. All of these come from instrument profiles validated against `contracts/instrument.schema.json`. A test proves a second dummy profile works with no engine code change.

### 11. Test-backed
Every requirement has at least one automated test, mapped in `traceability.md` (requirement → design section → task → test). A requirement without a passing test is not done.

## Amending this constitution

Only through the change process, with explicit approval from the project owner, recorded in `CHANGELOG.md`. Amendments are never made implicitly by a lower document or by code.
