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
  contracts receive `utils.http` — the v2 provider runtime, engine-bound per
  loaded endpoint: CONSTRUCTED FROM the doc's request + auth, per-call
  overridable on every field EXCEPT auth (injected by the transport at
  egress — fns never see credentials). `path` resolves against the request
  URL's origin (v1 `apiPath` semantics); absolute `url`s are allowed ("fns
  can do whatever they want" — egress hygiene is transport/Relay POLICY in
  hosted mode). `utils.log` mirrors v1's `client.logger`
  (→ EngineCtx.logger, silent default). NOT carried over: `resources`
  (stays removed, D19) and deterministic runId/idempotency keys (additive
  later).
- Preserved by construction: auth custody, fixture replay (transport-level
  record/replay captures every fn-issued call in order), billing
  determinism (D4 below), closed terms (the capability is passed in, never
  imported), content-hashing/interning. Consciously traded: compile-time
  knowledge of the exact wire sequence — it is fn behavior, reviewable in
  source and visible in fixtures.

## D3 — Contracts: async data/outcome schema pairs, not z.function

- Decision: `LifecycleStartFn: ({data: {input, request}, utils}) →
  Promise<Outcome>`, `LifecyclePollFn`/`LifecycleStopFn` with
  `{input, request, state}`; `Outcome = {kind: "running", state,
  providerRunId?, pollAfterMs?} | {kind: "completed", httpStatus, output,
  state?}` (stop's return is ignored). zod's z.function factory does not
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

## D5 — Run results: ONE running shape, providerRunId on both phases

- Decision (amends the D29 evolution note): `zRunRunning = {kind, state,
  pollAfterMs, providerRunId?}` for BOTH start and poll (review: "having
  the id doesn't hurt" — the derived minus-providerRunId poll variant was
  dropped). `providerRunId` is correlation-only (hosted teardown/webhooks);
  the state Json IS the handle. `zRunStartResult`/`zRunPollResult` are
  aliases of `zRunResult` kept for interface clarity.
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

## Concepts delta

| Term | Definition |
| --- | --- |
| **Lifecycle** (`lifecycle.start/poll/stop`) | The effectful hook family — the async run protocol. Start replaces declarative execution (request = data into it); poll = one status tick (running ∣ completed envelope); stop = best-effort abort. Leaf-wise per phase. |
| **Provider runtime** (`utils.http`) | v1 `ProviderRuntime` re-homed as host ABI: constructed from request + auth, per-call overridable except auth; path resolves against the request origin; sniff-decoded `{status, body}`; non-2xx returned, transport failures throw EXECUTION_FAILED. |
| **Outcome** | A lifecycle fn's return: `running{state, providerRunId?, pollAfterMs?}` ∣ `completed{httpStatus, output, state?}` — the completed arm IS the raw envelope the settle pipeline consumes. |
| **State** | The opaque Json handle threaded between ticks by value — ids + billing signals only, hard-capped (`schema.state_max_bytes`). v1's `providerRunId` + `metadata`, unified. |
| **Tick** (informal) | One `poll(runInput, state)` activity invocation. |
