# Design: add-async-run-protocol

Decision record (ADR-style), continuing the repo convention: context →
decision → consequences. Reviewed against monid-services' async adaptors
(Apify = the canonical example, `adaptors/apify/endpoints/actor-run.ts`) and
its Temporal `endpointExecution` workflow.

## D1 — `request` REQUIRED; `lifecycle` optional; fns RECEIVE the request

- Context: three shapes were debated across review rounds: (a) flat
  declarative phase sections (`poll`/`result`/`stop` request templates +
  toRequest/decide hooks), (b) a grouped section XOR `request` ("if
  lifecycle is defined, request is not used; both optional; one must
  resolve"), (c) a unified phases-are-the-format reshape. Review then
  landed the decisive observations: lifecycle phases should be FUNCTIONS
  ("more powerful — like monid-services"), and the fns "should be able to
  get the request as part of the input, so on second thought request should
  be required".
- Decision: `request` stays REQUIRED exactly as today (baseUrl fused,
  absolute url) and becomes DATA INTO the lifecycle — phase fns receive the
  compiled request as `ctx.data.request` ({pathParam}s substituted, static
  headers included). An optional `lifecycle: {start, poll?, stop?}` of fn
  refs rides beside it; when `start` resolves, the engine calls it INSTEAD
  of executing the request itself (exactly monid-services' semantics: a def
  always has `request`; `runLifecycle.start` replaces the default HTTP
  relay). No XOR rule, no dual encoding, and no per-endpoint factories —
  Apify's per-endpoint actorId rides in `request.path` as plain data under
  ONE generic provider start fn.
- Rejected: declarative phase grammars (a/c) — every observed async
  adaptor sequences calls imperatively (Apify's poll = status GET + dataset
  GET in one tick); a declarative DSL for consent-math/conditional fetches
  is a worse programming language. The declarative arm for START is
  `request` without a lifecycle; declarative poll/stop arms are reserved
  evolution. Also rejected: `request`-as-function — breaks compile-time URL
  verification and the catalog-visible wire target.
- Consequences: sync docs unchanged byte-for-byte; async-capable ⇔
  `lifecycle` present; provider-defaulted lifecycles compose leaf-wise per
  phase (D20's one rule, unchanged — deep-merge-at-leaf, closest wins).

## D2 — Effectful-by-capability: the IO invariant AMENDED, custody preserved

- Context: v1 lifecycle hooks receive a live HTTP client (`ProviderRuntime`)
  and do arbitrary IO; the standard's D4/D8 said "all IO happens in the
  engine, never in fns".
- Decision: the invariant becomes **"all IO flows through the engine's
  transport port"**. The four pure hooks are untouched; the three lifecycle
  contracts receive the v2 provider runtime, bound PER
  INVOCATION (amended, D14): `utils.http(call)` — the RAW explicit
  capability (`method` + `url`|`path` required; `path` resolves against the
  request URL's origin, v1 `apiPath` semantics; absolute `url`s allowed —
  egress hygiene is transport/Relay POLICY in hosted mode) — and
  `utils.request(overrides?)` — the DEFAULT RELAY: executes THE endpoint's
  compiled request initialized from data.request + caller input, any field
  overridable. Auth is injected by the transport at egress on both — fns
  never see credentials. Logging is `ctx.logger` (HookLogger), a ctx member
  of EVERY hook (D14), routed to EngineCtx.logger, silent default. NOT carried over: `resources`
  (stays removed, D19) and deterministic runId/idempotency keys (additive
  later).
- Preserved by construction: auth custody, fixture replay (transport-level
  record/replay captures every fn-issued call in order), billing
  determinism (D4 below), closed terms (the capability is passed in, never
  imported), content-hashing/interning. Consciously traded: compile-time
  knowledge of the exact wire sequence — it is fn behavior, reviewable in
  source and visible in fixtures.

## D3 — Contracts: async data/outcome schema pairs, not z.function

- Decision: `LifecycleStartFn: ({data: {input, request}, utils, logger}) →
  Promise<Outcome>`, `LifecyclePollFn`/`LifecycleStopFn` with
  `{input, request, state}`; `Outcome = {kind: "running", state,
  pollAfterMs?} | {kind: "completed", httpStatus, providerHttpStatus?,
  output, state?}` (stop's return is ignored; amended by D12/D14). zod's z.function factory does not
  model Promise returns, so the contract is the data schema + outcome
  schema pair, enforced by an async engine wrapper: ctx.data validated
  before the call, the awaited outcome after (FN_CONTRACT on either);
  EngineErrors thrown inside the fn propagate UNTOUCHED (utils.http
  transport failure = EXECUTION_FAILED retriable; malformed http call =
  FN_CONTRACT); any other uncaught throw → EXECUTION_FAILED — the
  monid-services ProviderError posture.
- Whitelist additions for lifecycle fn bodies: `encodeURIComponent`/
  `decodeURIComponent` (wire paths), `Promise` (parallel fetches).

## D4 — ONE settle pipeline; a lifecycle fn cannot bill an error

- Decision: completed outcomes carry the RAW envelope (`httpStatus` +
  `output`, plus final `state`), and the SAME settle pipeline runs for both
  execution modes: `usage.consolidate` (envelope widened with optional
  `state` — Apify's pricing signals ride the POLL response, not the dataset
  body, so they thread through state) → `output.fromResponse` →
  `output.schema`. The engine forces zero usage on EVERY non-2xx
  httpStatus; in-body vendor failures are fn-SYNTHESIZED statuses (a failed
  actor completes as a 500 envelope — the D25 in-body classification,
  delivered for async docs). Uniform D11: vendor non-2xx at any phase
  (start, poll, dataset fetch) is DATA — deliberate divergence from v1's
  infra-throw on dataset-fetch non-2xx.
- Not adopted from v1: the observed-cost-on-error channel (`actualCost` on
  failed runs) — v2 policy is vendor error ⇒ zero usage, period.

## D5 — Run results: ONE running shape; the id lives IN the state (amended by D14)

- Decision (amends the D29 evolution note): `zRunRunning = {kind, state,
  pollAfterMs}` for BOTH start and poll. The separate `providerRunId`
  field was first kept on both phases, then DISSOLVED into the state as
  the ONE reserved key `state.externalRunId` (D14) — the field duplicated
  what every connector already stored in state. `zRunStartResult`/
  `zRunPollResult` are aliases of `zRunResult` kept for interface clarity.
- Engine surface: `start(runInput)`; `poll(runInput, state)` and
  `stop(runInput, state)` take the caller's input alongside the state —
  re-derived deterministically (validate + input.toRequest) so fns see the
  same input every tick; Temporal activities hold the payload by value
  anyway. `stop` is best-effort void: no `lifecycle.stop` ⇒ no-op; with one
  ⇒ run + swallow everything (v1 posture — cleanup never masks outcome).
  NOT_ASYNC stays for `poll` without a resolved lifecycle.poll; `start`
  returning running without one fails closed (CONTRACT_VIOLATION — the
  "start that parks needs a poll" rule is a runtime fact of an opaque fn,
  unprovable at compile time).

## D6 — State discipline: ids + billing signals, hard-capped

- Decision: `state` crosses process boundaries BY VALUE every tick
  (RunRunning, Temporal payloads beside doc+input, run records, fixtures) —
  it carries IDENTITY + BILLING SIGNALS (run ids, dataset ids, pricing
  fields, attempt counters), never response payloads (outputs are fetched
  at completion; payloads in state would triple-store and threaten
  Temporal's 2 MB budget). Enforcement: a HARD engine cap —
  serialized state > `schema.state_max_bytes` (64 KiB, config fact) ⇒
  FN_CONTRACT fail-closed — plus review.

## D7 — Cadence: doc default + per-tick override; timeouts unchanged otherwise

- Decision: `timeouts.pollMs` (endpoint ?? provider ??
  `compiler.defaults.poll_interval_ms` = 2000) is emitted iff
  lifecycle.poll resolves (ENDPOINT-level pollMs without one = dead-config
  compile error; a provider-level pollMs over a mixed endpoint set is a
  legitimate default and simply not emitted for sync docs). A running
  outcome may carry `pollAfterMs` overriding the doc default for that tick
  (adaptive backoff via attempt counters in state). `requestMs` bounds each
  utils.http call; `runMs` bounds the whole run — `run()` uses the
  injectable clock (`EngineCtx.now`), and on expiry fires best-effort stop
  then throws TIMEOUT (which is also why a never-completing poll fn cannot
  loop forever; Apify: 300s, matching services config).

## D8 — Versioning: additive format; async floors via fn `api`

- Decision: ENGINE_VERSION 0.1.0 → 0.2.0 (minor). The doc format is
  ADDITIVE (`request` unchanged, `lifecycle`/`pollMs` optional), so
  `doc_format_since`/`fn_abi_since` stay 0.1.0; the new fact
  `schema.async_since: "0.2.0"` stamps lifecycle fn entries' `api`, and the
  existing `minEngineVersion = semverMax(...)` machinery floors lifecycle
  docs at 0.2.0 with ZERO new mechanism. Sync docs (exa/akta/octen/
  tinyfish) recompile byte-identically at 0.1.0 — never over-pinned.
  `spec_version` stays 1.0.0 deliberately: it is a `z.literal` gate in
  every engine binary, so bumping it would make old engines reject even
  sync docs.
- AMENDED (D14): `fn_abi_since` → **0.2.0** — the hook ctx gained `logger`
  as its third member, and "the oldest engine that understands the current
  ABI" is honestly 0.2.0 (no 0.1.0 engine ever shipped or passed it).
  Every compiled doc now floors at 0.2.0; the earlier "sync docs stay
  0.1.0" property was real only while the pure-hook ABI was untouched.

## D9 — Apify: schemas fetched fresh at AUTHORING time, static in-repo

- Context: v1 fetched actor input schemas at RUNTIME
  (`detail-enrichment.ts`, whose own TODO calls it "the one nonuniform def
  surface"); the v2 bundle must be a pure function of repo content.
- Decision: `scripts/apify-scaffold.ts` fetches each actor's CURRENT
  published schema (`GET /v2/acts/{owner~name}/builds/default` →
  `actorDefinition.input`) and generates `schema/inputs.ts` as non-strict
  zod (actors accept supersets; unknown fields pass through) — reviewed,
  curated, committed. Drift = a live-gated test diffing live REQUIRED
  properties against the compiled schema (`test:live` signal, never a build
  break); refresh = re-run the scaffold. Rejected: raw JSON-Schema values
  in defs (two schema languages, no typed hooks).

## D10 — Apify port fidelity notes (recorded realities)

- The whole lifecycle + settle fn lives ONCE at provider level (v2 form of
  `actorRunLifecycle` attached to every def); endpoints are meta + start
  request (actorId baked as `owner~name` in the path) + input schema. All
  five tranche-1 docs share ONE fnTable entry per lifecycle fn (interning).
- Billing = `actualCostFromPricing` 1:1: units = dataset item count as
  `result`; PRICE_PER_DATASET_ITEM multiplies `pricePerUnitUsd × items`;
  PAY_PER_EVENT reads `usageTotalUsd`; other models → no cost (evidence
  only). Recorded reality: these actors report PAY_PER_EVENT with
  `usageTotalUsd: 0` at completion (Apify's usage lags the run record) —
  identical to v1's read; units remain the primary basis.
- Recorded reality: the linkedin actor SUCCEEDS on garbage input with an
  error ITEM in the dataset (billed as 1 result — v1's actorRunBilling
  parity); google-maps returned 20 items despite `max_results: 3` (actor
  behavior, faithfully recorded). Actor failure (exitCode ≠ 0) and 401
  paths are synthetic fixtures (a valid key cannot produce them).
- v1 surfaces NOT ported (hosted concerns): `unitPrice`/pricing notes
  (Broker's Offer side), estimation labels (`estimate` reserved), `tags`
  (D25), catalog `visibility` (hosted policy — tweet-scraper's v1
  private-catalog flag is not doc identity).

## D11 — Fixture diet: fixtures are TRIMMED recordings

- Context: raw async recordings carry whole vendor payloads (instagram's
  happy chain recorded at 176 KB, gmaps 86 KB) of which ~99% is repeated
  content no test asserts on; tranche 2 would multiply that ×55 into
  permanent git history. Review asked what fixtures buy at all: almost
  entirely the replay substrate (offline/keyless/free verification of
  billing math + wire sequences — the repo's core testing invariant), plus
  the only checked-in record of real vendor quirks. Deleting them would
  make endpoint tests live-only (no CI coverage, per-run vendor fees);
  synthetic-only would revert the deliberate recorded-reality upgrade.
- Decision: keep the recordings, drop the bulk. `record` applies a
  deterministic TRIM pass by default (`--no-trim` opts out): every array in
  a RESPONSE body capped to its first 2 elements, string leaves truncated
  at 500 chars — requests, urls, statuses, order, and object keys untouched
  (`trimJson`/`trimCalls`, shared/testing/fixtures.ts). Replay matches
  REQUESTS only, so trimming can never cause a replay mismatch; only what
  the engine CONSUMES shrinks, and count assertions state the trimmed
  reality (gmaps 20→2 items, tweets 3→2). A fixture-size lint bounds the
  files (warn 32 KiB, fail 128 KiB — warns are non-blocking nudges;
  pre-policy fixtures like octen's ride the warn lane until re-recorded).
- Consequences: instagram 176→41 KB, gmaps 86→23 KB, tweets 55→35 KB; real
  wire chains and vendor shapes survive; tranche 2 inherits the diet by
  default.

## D12 — Provider-error categorization: digest via a hook, ours/theirs optional

- Context: v1 categorizes with a data/error SPLIT field
  (`providerResponse.data` XOR `.error`), a REQUIRED ours/theirs status
  pair (`httpStatus`/`providerHttpStatus`, lifecycleResults.ts), and
  adaptor-normalized error bodies (`apifyErrorBody` → `{message, type?}`)
  called at every error site — which also DROPS the raw body. Review asked
  for v2 to pass errors along AND make them digestible.
- Decision — three moves, one table:
  1. **`output.fromError`** — the fifth PURE hook (optional, leaf-wise like
     fromResponse; shares its contract shape): the presentation-only
     projection of provider-error envelopes. Runs ONLY when
     isProviderError, AFTER zero-usage forcing (structurally cannot touch a
     bill); absent ⇒ raw passthrough. Convention: digest into
     `{message, …}` and keep the full body under `raw` — digest, never
     hide (v1 discarded it). Digestion is ONE hook instead of a helper
     repeated at every error site. `output.schema` never applies to error
     projections.
  2. **`providerHttpStatus?`** (THEIRS) on completed outcomes and
     RunCompleted — stated ONLY when a lifecycle fn SYNTHESIZED the billed
     status (failed actor: ours 500, theirs 200); absent = relayed
     verbatim (v1 required the pair verbatim everywhere; our sync path
     cannot invent statuses, so absence-means-relayed is safe).
  3. v1's data/error split collapses into ONE `output` + isProviderError;
     the observed-cost-on-error channel stays dropped (vendor error ⇒ zero
     usage, period).
- The categorization table (apify as the reference):

  | Case | httpStatus | providerHttpStatus | output | usage |
  | --- | --- | --- | --- | --- |
  | Vendor API non-2xx | vendor status | absent | fromError projection (raw kept) | zero |
  | Vendor job failed in-body (exitCode ≠ 0) | fn-synthesized 500 | 200 | fn `{message}` → fromError | zero |
  | Error ITEM in a successful dataset | 200 | absent | normal output — NOT a provider error | billed per item |
  | Infra (no run id, transport throw) | — thrown EXECUTION_FAILED (retriable) | — | — | n/a |

## D13 — Steps array REJECTED; stage-dispatch is the multi-stage pattern

- Context: review asked whether start+poll should generalize to an array
  of steps (each possibly polling), double-checked against EVERY
  monid-services async adaptor.
- Evidence: apify (poll = status GET + dataset GET), minimax video (poll =
  query + files/retrieve), bytedance/alibaba/suzanne/clay/hunterio (plain
  polls), surf (poll = status + results fetch), mint (preview-approve
  MID-poll ⇒ ONE poll fn dispatching on `state.stage`), saperly
  provision-number (a 4-call SAGA entirely inside START — no waiting
  between calls), saperly calls (metered accrual — a separate billing
  clock, the declared metered wave, not a steps problem), apollo (poll +
  readback graft — state stays small). ZERO adaptors chain two polling
  stages.
- Decision: REJECTED as over-engineering. Imperative fns already cover
  multi-call phases; multi-STAGE chains are expressible today as a state
  machine in one poll fn (`state.stage` dispatch — the mint pattern, the
  canonical expression). A steps array would ripple through outcomes, run
  results, the engine loop, the hosted Temporal loop, and fixtures for
  generality nothing observed needs. Revisit trigger: a real connector
  whose stage-dispatch poll fn becomes unwieldy.

## D14 — ABI polish round: three-part ctx, the default relay, externalRunId

- **ctx = `{data, utils, logger}` for EVERY hook** (review: "three, not
  logger in utils"): `HookLogger` (debug/info/warn/error — no `child`;
  defined in core to keep it dependency-free) is its own ctx member;
  `utils.log` deleted. The auth hook's logger is DELIBERATELY silent
  regardless of host config — resolved credentials are in scope there.
  Consequence: fn_abi_since 0.2.0 (see D8 amendment).
- **`utils.request(overrides?)` beside an untouched `utils.http`** (review:
  "keep http its own place; a new thing does the defaults"): the DEFAULT
  RELAY executes the compiled request initialized from data.request +
  caller input; overrides are method/headers/queryParams/body/requestMs —
  deliberately NOT url/path (a different target is what `http` is for).
  Apify's start collapses to `await utils.request()`. Both bind PER
  INVOCATION (they need the tick's derived input + substituted url).
- **`state.externalRunId`** replaces the `providerRunId` field (review:
  rename + structure): the vendor's run id is part of the handle, so it
  lives IN the handle — ONE reserved state key ("external*" =
  monid-services' cross-system prefix), engine-enforced when present
  (non-empty string, else FN_CONTRACT), everything else fn-owned. Hosts
  correlate via `state.externalRunId` (↔ v1 providerRunId). A rigid state
  schema stays rejected — it would fight the imperative-fn design.

## Concepts delta

| Term | Definition |
| --- | --- |
| **Lifecycle** (`lifecycle.start/poll/stop`) | The effectful hook family — the async run protocol. Start replaces declarative execution (request = data into it); poll = one status tick (running ∣ completed envelope); stop = best-effort abort. Leaf-wise per phase. |
| **Provider runtime** (`utils.http` + `utils.request`) | v1 `ProviderRuntime` re-homed as host ABI, bound per invocation: `http` = raw explicit calls (path resolves against the request origin); `request` = the default relay over the compiled request + caller input, field-overridable. Auth injected at the transport on both; sniff-decoded `{status, body}`; non-2xx returned, transport failures throw EXECUTION_FAILED. |
| **Outcome** | A lifecycle fn's return: `running{state, pollAfterMs?}` ∣ `completed{httpStatus, providerHttpStatus?, output, state?}` — the completed arm IS the raw envelope the settle pipeline consumes. |
| **State** | The opaque Json handle threaded between ticks by value — ids + billing signals only, hard-capped (`schema.state_max_bytes`). ONE reserved key: `externalRunId` (the vendor's run id — v1's `providerRunId`); the rest is fn-owned (v1's `metadata`). |
| **Tick** (informal) | One `poll(runInput, state)` activity invocation. |
