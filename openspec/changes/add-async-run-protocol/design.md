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

## D15 — Structured run state: patches, engine timing, typed `state.data`

- Context: review round on PR #2 — state should record timing the way
  monid-services does (usage events to ClickHouse), the typed-state
  extension was approved ("so let's do that"), and kinds should follow the
  v1 UPPERCASE convention.
- **`zRunState` replaces the opaque Json handle** (run/state.ts): a
  structured envelope `{externalRunId?, stage?, data?, timing}`, split by
  OWNERSHIP: fns return the three fn-owned fields, the ENGINE stamps
  `timing` (fns structurally cannot tamper: the fn-state has no timing
  field). [The original zStatePatch presence-merge is SUPERSEDED by D21's
  whole-state semantics.] D14's "a rigid state schema stays
  rejected" is SUPERSEDED for the envelope (the bag stays free-form
  unless typed, below).
- **Engine-owned timing rides state** (`zRunTimingInFlight`: startedAt,
  startRequestMs, lastPolledAt, attempts, pollMsTotal, deadlineAt — ISO
  strings, payload-safe): the engine is invoked STATELESSLY per tick, so
  state is the only cross-tick carrier; the engine measures (it holds the
  injected clock and wraps the transport — clean provider slices, no host
  queue overhead), state stores, and `RunCompleted.timing` reports at
  settle (`zRunTiming` incl. providerTotalMs) — mapping 1:1 onto the v1
  ClickHouse waterfall's provider slices (t_provider_start_request_ms /
  t_provider_polling_ms / t_provider_total_ms). Host slices
  (queue/gate/save…) stay host-measured, exactly as in v1. Sync runs
  report timing too (attempts 0) — no lifecycle special case for usage
  events. `deadlineAt` = startedAt + timeouts.runMs, recorded so hosts
  enforce the SAME budget `run()`'s loop enforces.
- **Typed state — `lifecycle.state`**: defs may declare a zod schema for
  the fn-owned `data` bag; the compiler saves it as JSON Schema at
  `doc.lifecycle.stateSchema` (hash-covered, catalog-visible — hosted
  mode has no def source, so the doc must carry it) and the engine
  validates `state.data` on EVERY boundary: after each start/poll return
  (FN_CONTRACT) and before each poll/stop invocation (INVALID_INPUT —
  host-side corruption is the caller's fault). The live zod object doubles
  as the author's compile-time type; the doc schema is the runtime
  authority. Apify declares it once at provider level.
- **UPPERCASE kinds, defined once**: `RunKind = {RUNNING, COMPLETED}`
  (v1 zProviderRunStatus convention), shared by fn outcomes and engine
  results; `zRunRunning = zLifecycleRunning.extend({state: zRunState,
  pollAfterMs: required})` — the two shapes differ EXACTLY by what the
  engine adds at the boundary. Endpoint-level kinds REJECTED: a kind is a
  host protocol verb; endpoint phases ride `state.stage` (D13).

## D16 — Egress hygiene: same-origin credentials + https-only

- Context: PR #2 findings 8 (credential scope) and 9 (plaintext targets).
- **Same-origin credential rule**: `utils.http`/`utils.request` inject the
  provider's credentials ONLY when the target origin equals the doc
  request's origin — cross-origin calls egress BARE
  (`PreparedRequest.auth` optional; transports skip injection entirely,
  credentials are never even resolved). Fns can still reach other hosts
  (dataset CDNs, signed URLs) — they just never carry the vendor key
  there.
- **https-only**: `zHttpCall.url` and the request-override target take
  `z.url({protocol: /^https$/})` — a plaintext absolute target is a fn
  bug (FN_CONTRACT), not a policy knob.
- **`utils.request` gains the target** (supersedes D14's "deliberately NOT
  url/path"): review settled that `request` can do ANYTHING `http` can —
  the two differ only in DEFAULTS (request = the compiled request's,
  presence-based overrides incl. `url`|`path`; http = zero defaults, the
  doc-header merge removed: `headers` ARE the outbound set).

## D17 — usage.model + usage.estimate (pre-run cost, rate-free shapes)

- Context: review requirement — pre-run estimates in the SAME units as
  consolidate, plus a rate-free declaration of the vendor's cost shape.
- **`usage.model`** (usage/model.ts): inline DATA on the doc (never a fn)
  — `per_call | per_result | per_unit | unit_matrix | tiered`, mirroring
  v1's authoring-legal price kinds. METERED dropped (v1 deprecated it in
  place — duration is `per_unit` with SECOND/MINUTE); BY_PERIOD out of
  run scope; no "composite" kind (matrix/tiered ARE the composites, and
  `zUsage.units` is already an array). `startWith: "call"` keeps the
  base-fee-then-meter shape (v1 PER_RESULT.flatFee / Apify actor-start).
  matrix/tiered stay DISTINCT (admission-time variant reject vs
  settle-time quantity metering with `offset`). Rates live in the
  catalog, never the doc.
- **`usage.estimate`**: the 6th pure hook (v1 `paymentLifecycle.estimate`)
  — validated input → estimated `Usage`; engine entrypoint
  `estimate(runInput)` (no IO, no state); absent ⇒ one CALL unit (v1
  PER_CALL base). Presets carry the count SHAPES (`presets.estimate.*`:
  perCall, onePerQuery, limitIsExact, perQueryLimit, limitIsPages,
  perQueryPages, dualLimit) applied with the ENDPOINT'S OWN pinned
  input-schema fields as args (`limitIsExact(["maxItems"], 3)`). v1's
  allow-list PROBING (limit-resolver.ts: try 13 field names against an
  unknown input) was a WORKAROUND for unpinned actor inputs — v2 inputs
  are typed per endpoint, so field discovery is deliberately NOT ported
  (review: "we already have the input pinned; estimate directly matches
  the input"). Likewise `usage.model` is declared per ENDPOINT (no
  provider default) — the cost shape is a per-actor fact beside the
  schema that defines it.
- **Coded error classes** (same round): `JsonPathError`
  (PATH_SYNTAX/PATH_NOT_FOUND/TYPE_MISMATCH) and `CompileError`
  (SCHEMA_INVALID/HOOK_UNRESOLVED/STATE_SCHEMA_INVALID/DOC_MALFORMED),
  both `retriable = false`; a lifecycle fn's escaped `retriable === false`
  throw classifies FN_CONTRACT (deterministic bug — retry cannot succeed),
  NOT the blanket EXECUTION_FAILED.
- Consequence: breaking hook ABI revision — ENGINE_VERSION 0.3.0;
  fn_abi_since/async_since 0.3.0 (every doc floors there).

## D18 — Rates are services-owned; the model is a rate-free billing ALGEBRA

- Context: review arc on "transparent estimates" (rate on the doc? \u2192 no)
  \u2014 settled by a LIVE fact: every one of our 46 apify actors now publishes
  PAY_PER_EVENT pricing whose event prices are TIERED BY OUR SUBSCRIPTION
  PLAN (`eventTieredPricingUsd: FREE\u2026DIAMOND`, verified raw). Any
  repo-baked rate would mis-price some account, so:
- **Ownership**: DOC = the billing SHAPE (`usage.model`); ENGINE = the
  COUNTS (`estimate()` pre-run; the settle tail post-run) + in-band
  vendor-cost EVIDENCE (`usage.cost`, tier-correct by construction);
  SERVICES = the rate card ((endpoint|provider, tier) → $ per model unit)
  AND the multiply. NOTHING rate-shaped ships from this repo (rev-3's
  zVendorRate/applyRate helper was REJECTED: services-owned config ⇒
  services-owned code). Services-side expectations: estimate hold =
  card × `estimate().units`; settle vendor cost = `usage.cost` evidence
  else card × units; reconciliation alert when evidence diverges from
  card × units.
- **The model algebra — three orthogonal operators** (one kind per file,
  usage/model/; union + DERIVED enum in mod.ts via
  extractZodDiscriminatorKeys, the v1 zPriceTypes pattern):
  - LEAF: `PER_CALL` (flat — the run is the product; billed 1 iff
    success; NO unit field and NO measure) and `PER_UNIT` (metered —
    billed per N of `unit`).
  - AND: `COMPOSITE` — the SUM of scalar components (v1 leaf.ts lineage;
    ≥2 components, ≤1 PER_CALL, distinct PER_UNIT units, no nesting).
    The verified apify actor-start fee + per-item metering is
    `[PER_CALL, PER_UNIT·RESULT]` (17 of 46 actors).
  - SELECT: `VARIANT` (née unit_matrix — renamed: rate-free docs carry
    variant SELECTION, not a rate matrix; v1's own rows were already
    named `variants`) — request coordinates pick WHICH card row prices
    the unit; exactly one active; unmatched ⇒ unpriceable ⇒ admission
    rejects.
  - DELETED: `TIERED` — volume schedules are a shape of the services
    CARD ROW, invisible to a rate-free doc; the doc's only job is naming
    the quantities, which PER_UNIT/COMPOSITE do (octen "call + token
    tier" ≡ COMPOSITE([PER_CALL, PER_UNIT·TOKEN]) + a tiered card row).
- **CALL is not a Unit**: every old CALL measure was PER_CALL restated (or
  an arbitrary unit on a zero). `usage.units` answers ONE question — how
  many of each COUNTABLE thing did this run consume — so a flat charge
  (fully known from model + success) never appears in it. Consequences:
  `zUsage.units` may be EMPTY (the canonical "nothing counted"),
  `zeroUsage()`/`defaultUsage()` return `{units: []}` (a zero is
  unit-agnostic), `presets.usage.perCall()` settles `{units: []}`, the
  engine's no-estimate default is `{units: []}`, and there is no
  estimate.perCall preset.
- **The enum rule**: UPPERCASE keys AND values for every closed
  vocabulary (`Unit.RESULT = "RESULT"`, `UsageModelKind.PER_UNIT =
  "PER_UNIT"`); lowercase is a DISPLAY concern (web/CLI label maps).
  Defs reference consts, never raw strings; closed-term fn BODIES write
  the raw UPPERCASE literal (they cannot import).
- **Estimate is a first-class surface**: `estimate()` is the one PURE
  public engine entry (workflow admission holds AND standalone tooling —
  `deno task engine:estimate` prints model + estimated units with a
  rejecting transport as the no-IO proof). The public surface is
  estimate/start/poll/stop/run; `settle` is the INTERNAL tail of
  whichever tick completes; `run()` = start + injectable-sleep + poll
  loop (embedded mode: CLI/tests/recorder — Temporal re-implements the
  loop as durable activities and never calls it). The card invariant is
  TESTED: estimate and settle report the model's billed units, so one
  card row prices both ends; count-true chains assert estimate ==
  settled units exactly.
- **Pricing drift guard**: `deno task apify:pricing` re-fetches every
  actor's published pricing and fails on regime change or shape mismatch
  vs the declared model (rates deliberately unchecked — tier-dependent).
  It caught instagram-api-scraper's missed actor-start event on its
  FIRST run.
- **Variant-priced vendors (Apollo posture)**: prefer the vendor's own
  meter (credits) so variant complexity collapses into the COUNT; billed
  units must be explainable from the response the caller holds (output
  markers, the linkedin precedent) + itemized `usage.evidence`
  arithmetic. No black-box counts.
- Follow-ups: exa re-model to credits (confirm per-response reporting
  first — SUPERSEDED by D19: exa#search re-modeled base-plus-overage);
  linkedin-profile-search-by-name/-by-services billing basis review (they
  publish the search-page event family but bill per RESULT today, v1
  parity); add-on events as extra COMPOSITE components where estimate
  fidelity warrants.

## D19 — Component ids: keyed composite, keyed counts, fns own conditions

- Context: the broker needs (1) CORRESPONDENCE — which model component a
  settled quantity belongs to — and (2) EXACT per-event price matching
  against vendor cards. D18's anonymous composite array made both
  positional/by-unit, its constraints (≤1 PER_CALL, distinct units)
  forbade the models vendors actually publish (tiktok-comments' two flat
  events; linkedin's two same-unit profile rates), and exa#search's real
  card (base covers the FIRST 10 results + per-result overage, v1 TIERED
  with `selector.offset: 10`) was mis-modeled as plain PER_UNIT·RESULT.
- **Composite components = a MAP keyed by component id**
  (`components: Record<zComponentId, zScalarUsageModel>`, ≥2 entries; the
  old constraints DELETED — the key disambiguates; id uniqueness
  structural). Leaf models stay IMPLIED and untouched — the map is
  composite-only, structure only where charges combine. For apify the id
  is the vendor's charge-event name VERBATIM (actor-start, comment,
  search-page… — live-surveyed): one string joins doc ↔ counts ↔ broker
  card row ↔ drift guard ↔ the stashed run-record rates
  (`state.data.pricingPerEvent[id]`). octen/exa components use
  response-field / our names (`full_content_tokens`, `call`,
  `additional_result`).
- **`usage.units: Measure[]` → `usage.counts: Record<string, number>`**
  (zMeasure DELETED; `cost`/`evidence` unchanged) — ONE simple map for
  every model type: composite → component id keys (metered only; a flat
  component never appears — model + success covers it); leaf PER_UNIT →
  ONE implied key, the model's unit (`{"RESULT": 10}`); PER_CALL / error
  settle → `{}` (the canonical "nothing counted" — zeroUsage/defaultUsage/
  presets.usage.perCall/the no-estimate engine default all return
  `{counts: {}}`). Broker math is a blind fold over the card:
  `PER_CALL row → success × rate; metered row → rate × counts[key] ?? 0`.
- **Fns own ALL conditions, offsets, and selection** — the model only
  ENUMERATES chargeable components; every v1 price type maps in with NO
  new kind:
  - v1 TIERED (verified from source: "bills its default and ADDS every
    tier whose `when` matches" — summed conditional lines, NOT
    select-one): a gated line is a component whose count is 0 when the
    feature is off — octen's `full_content.enable` gate became "the
    token count is absent" (no gate in the model).
  - v1 PER_UNIT_MATRIX (the actual select-one/OR): a composite whose fn
    populates ONLY the selected key — linkedin-profile-search's
    `profileScraperMode` picks `full-profile` vs
    `full-profile-with-email` ("Short" selects none). **The VARIANT kind
    is DELETED** (selector.ts/variant.ts removed; zero docs used it) —
    the algebra SHRANK: `Model = PER_CALL | PER_UNIT | COMPOSITE{id →
    leaf}`.
  - v1 offset (exa: base covers first 10): a COUNTING rule —
    `counts["additional_result"] = max(0, results − 10)` in
    consolidate/estimate, never a model shape.
  Rationale vs declarative model gates: gates re-introduce v1's matcher
  mini-DSL (loose-match rules, `offset`, `in: body/output`), duplicate
  truth (DSL vs fn), and buy only zero-code estimates — which presets
  already provide by reading the same pinned-input fields.
- **Optional `description` on scalars** — a human note on what a derived
  count means ("results above the 10 included in the base fee");
  documentation only, never a join key. Price-line display names live on
  the broker CARD rows.
- **Generic keying**: the doc's own `model` rides into the consolidate
  envelope AND the estimate ctx (`data.model`), so GENERIC provider fns
  and presets derive their key with zero per-doc code — leaf → the unit,
  composite → the sole PER_UNIT component id.
- **Enforcement, left-shifted**: COMPILE — a composite with ≥2 metered
  components MUST declare doc-level consolidate + estimate (the generic
  fn can't choose a key; exactly one doc trips it: linkedin); RUN — thin
  engine `validateUsage` on consolidate output and estimate returns
  (composite → keys name metered components; leaf → key = unit;
  PER_CALL/no-model → `{}` only; FN_CONTRACT), exercised in CI by every
  fixture-chain replay. TS literal-key generics: deliberately deferred.
- **Drift guard v2**: `apify:pricing` additionally asserts every declared
  component id ∈ the actor's published `actorChargeEvents` keys — a
  vendor rename/removal fails NAMING the id; the reverse direction stays
  shape-level (unmodeled add-on events must not fail the guard).
- **Broker contract (offer ≠ model)**: the model is vendor COST truth
  (full fidelity, always); the card is PRICE policy — rows key into
  component ids with NO completeness requirement, so v1's "omit the flat
  fee" simplification (optional `PerResultPrice.flatFee`) becomes a card
  decision: fold `actor-start` into the metered rate, or offer flat
  per-call pricing over a metered model. cost(run) from model + stashed
  live rates stays exact per event either way; margin = price − cost.
- Re-models this round: tiktok-comments-scraper-api (collapsed PER_CALL →
  two flat components), exa#search (PER_UNIT·RESULT → base-plus-overage),
  linkedin-profile-search (PER_UNIT·PAGE → the three published events,
  mode-keyed fns).

## D19a — Billing-contract hardening: model REQUIRED, presets diet, actor-default knobs

- **`usage.model` is REQUIRED** (resolved endpoint ?? provider, compile
  error if neither — consolidate's exact rule; `doc.usage.model`
  non-optional): every doc states what is chargeable; optionality only
  bought silent "nothing countable" fallbacks. `data.model` in the
  estimate/envelope ctxs is non-optional in turn.
- **Presets are SHARED terms with SINGLE-field args**: a preset earns its
  existence by ≥2 call sites and a plain signature. perQueryPages /
  limitIsPages (single-use) and dualLimit (dead) are DELETED — their call
  sites carry inline fns; multi-knob docs (two limit fields, two
  multiplier arrays, comma-separated terms, mode-aware caps) write inline
  estimates instead of widening preset signatures. Kept: perQueryLimit /
  limitIsExact / onePerQuery. Model-key derivation inside presets and the
  generic apify consolidate is SWITCH-shaped (one style at every model
  consumer).
- **Actor-default knobs become schema `.default(…)`** — ONLY where the
  value mirrors the actor's OWN server default (verified live; a default
  is SENT, so an invented one would change vendor behavior):
  tiktok-video-scraper resultsPerPage 1 + scrapeRelatedVideos false;
  youtube-video-transcript max_videos 10. instagram-search-scraper's
  searchLimit has NO server default (prefill only) — its estimate keeps an
  in-fn fallback. The engine's input validation MATERIALIZES schema
  defaults into a cloned body (ajv useDefaults; the caller's object is
  never mutated; output validation stays default-free), so hooks read the
  same effective knobs the vendor applies.
- Estimate-fidelity fixes ride this design (PR #2 findings): comma-term
  counting (instagram-search), related-video counting (tiktok-video),
  channel-default counting (youtube-video-transcript).

## D20 — Review-round fixes: state-size projection, presence overrides, bounded naps, recorder scrub, coded compile errors

- apify's poll PROJECTS `actorChargeEvents` to `{eventPriceUsd}` per event
  (verbatim event-name keys kept — the D19 join): the raw card carries
  marketing text + per-plan tier tables and could push serialized state
  over `schema.state_max_bytes`, failing a completed, already-paid run.
- `utils.request` body override is PRESENCE-based (`{body: null}` egresses
  null — null is valid JSON, `??` treated it as absent).
- `run()` caps each nap at the remaining runMs budget — a fn-requested
  long `pollAfterMs` cannot delay TIMEOUT + best-effort stop.
- The recorder scrubs REQUEST bodies too (always-on; URLs kept for the
  replay matcher + `{{request.url}}` binding); test data follows the
  placeholder-identity convention (consented or public-figure names —
  "Feiyou Guo" / "Steve Jobs" — never third-party living individuals).
- Compiler-boundary `parseSchema` failures rethrow as
  `CompileError(DOC_MALFORMED)` with the ValidationError as cause — every
  compiler rejection is coded (author-time `defineEndpoint` keeps
  ValidationError: that IS the authoring surface).
- DECLINED per review: http `baseUrl` schema pin (defs are hand-written
  and manually reviewed); the VARIANT-selector finding (targets the kind
  D19 deleted).
- Versions RESET to the 0.0.1 pre-release floor (engine, doc_format_since,
  fn_abi_since, async_since); version:check requires the version to
  DIFFER from base when contract paths change (not to increase).

## D21 — Whole-state outcomes replace the patch merge

- Context: PR #2 found the presence-merge used `??`, so an explicit
  `data: null` ("clear my bag") was treated as absent and stale billing
  signals survived. Review counter-proposal (adopted): don't fix the
  merge — DELETE it.
- **Each lifecycle fn returns the COMPLETE next fn-state or nothing**:
  `Outcome.state` PRESENT ⇒ it IS the whole next `{externalRunId?,
  stage?, data?}` (replaces wholesale); ABSENT ⇒ the previous fn-state
  carries forward untouched. Two cases, zero field-level rules — the
  null-vs-undefined ambiguity class is structurally gone. States are
  immutable constants per tick.
- `zStatePatch`/`mergePatch` deleted; `zFnState` is the outcome state
  shape; `RUNNING.state` became optional (the old `state: {}`
  keep-everything idiom reads `{ kind: "RUNNING" }` now). Engine-owned
  `timing` stays engine-attached — fns never see or return it.
- Fn fallout was two lines: the apify provider poll and the linkedin
  poll each dropped `state: {}` from their keep-running arms; every
  other return was already whole-state.

## D22 — Endpoint PUBLIC identity: the def's native path, not the folder

- Context (review): "each endpoint should have a public endpoint, most
  likely request.path (see monid-services); even a customized name must be
  DEFINED somewhere — not the file name". The old id minted
  `provider#<folder leaf>` — identity conjured from the filesystem.
- **`zEndpointDef.endpoint`** — a native PATH (`zEndpointPath`,
  leading-`/`), v1 parity (`"/search"`, `"/v1/company/enrichment"`,
  `"/apidojo/tweet-scraper"`). ABSENT ⇒ `request.path` with trailing
  slashes stripped (the default covers exa/octen/akta verbatim); declared
  only where the native path is transport plumbing (apify: the actor slug
  path, mechanically derived from `/v2/acts/{owner}~{name}/runs` and
  PINNED in each def for readability — 46 backfilled) or empty (tinyfish:
  per-endpoint baseUrls, `request.path` is "/").
- **Doc id = `provider#` + the endpoint path minus its leading slash**
  (`exa#search`, `akta#v1/company/search`,
  `apify#apidojo/tweet-scraper`): the FIRST `#` splits provider from
  endpoint unambiguously. The compiled doc also carries `endpoint`
  verbatim (the catalog/broker-facing name). Uniqueness per provider is a
  compile check (duplicate identity = DOC_MALFORMED).
- Folder names are ORGANIZATIONAL only (the group-dir rule finished the
  thought): the loader keeps a folder-shape lint but never mints identity;
  `findEndpointDir` resolves identity → source dir by matching the pinned
  `endpoint` field, then the default request.path, then the leaf name.
- Type layer landed with it (design D19a's deferred piece, review-approved):
  `defineEndpoint` is generic over the model (`const M`) and the input
  body schema — counts keys narrow to the model's literal metered keys
  (typo/flat-key/preset-on-flat-doc are typecheck errors; proven by
  ts-expect-error tests), and `data.input.body` is `z.output` of the
  doc's OWN schema (direct property access, sound because validateInput
  runs the same schema first). The runtime twin `countsMismatch` lives
  beside the usage schema (ONE exhaustive switch with a
  `satisfies never` default; the engine wraps violations in FN_CONTRACT).

## D23 — No estimate presets; typed where declared, Json where raw

**Decision**: delete `presets.estimate.*` (onePerQuery / limitIsExact /
perQueryLimit) — every estimate is a TYPED INLINE fn on its doc. And type
everything a doc-declared, engine-validated schema exists for; keep raw
vendor data `Json` deliberately. Ctx facts move to provenance-named
paths: `data.usage.model`, `data.lifecycle.state`.

**Why the presets had to go** (review finding): they bypassed the D19a
type layer from BOTH sides — the field args were unchecked strings
(`limitIsExact("maxItmes", 3)` compiled and silently became
always-fallback) and the portable ctx (`body?: unknown`) erased the
input typing. "Typed generic presets" cannot fix this: the factory call
is EAGER, so TS must resolve the type params from the call's args alone
— the doc's body/model types aren't in scope when the field arg binds.
Explicit type args would work but out-verbose the inline fn while
duplicating declarations the doc already carries; a lazily-generic
returned fn gets the ctx inferred at assignment, but the field arg bound
BEFORE the type param existed. Structurally out of inference's reach —
so the inline fn IS the typed preset: exact input type in
(`data.input.body` = z.output of the doc's own schema), exact model keys
out (`MeteredKeyOf`). The ≥2-call-sites rule then also killed the dead
`transform.strip/pick` and `usage.perResult`; `presets.auth.*` and
`presets.usage.perCall` survive as provider-seam slots with no doc-local
typing to lose.

**The typing rule** (this answers "why is output not typed" once):
- TYPED — anything a doc-declared schema describes AND the engine
  validates on the same boundary before the fn sees it: the input body
  (validateInput, defaults materialized) and the fn-owned `state.data`
  bag (`lifecycle.state` → stateSchema, checked every tick). State is
  typed at READ sites (`data.lifecycle.state` in tick + envelope ctxs)
  and WRITE sites (lifecycle outcome `state`) — a poll stashing a
  mis-shaped billing signal fails `deno task check`.
- JSON — raw vendor output and error envelopes: the settle pipeline is
  `consolidate(RAW) → fromResponse → output.schema`, billing anchors to
  the raw payload BEFORE any projection, and `output.schema` describes a
  DIFFERENT value (the post-fromResponse product) — typing raw reads by
  it would claim a shape the runtime never checks there. `utils.json` is
  the idiom for raw; typed fromResponse RETURNS were considered and
  dropped (little over the runtime gate, couples doc types to
  vendor-shaped output).
- RENAMED — ctx paths say their provenance: `data.usage.model` (was
  `data.model`), `data.lifecycle.state` (was `data.state`; required in
  tick ctxs, optional in envelopes — present only for async runs that
  produced state). Estimate fns never probe `data.input.body` via
  utils.json (fleet-swept; grep-clean), and dead `body ?? null` guards
  died with the sweep.

## Concepts delta

| Term | Definition |
| --- | --- |
| **Lifecycle** (`lifecycle.start/poll/stop` + `lifecycle.state`) | The effectful hook family — the async run protocol. Start replaces declarative execution (request = data into it); poll = one status tick (RUNNING ∣ COMPLETED envelope); stop = best-effort abort; `state` = the OPTIONAL zod schema typing the fn-owned `data` bag (compiled to `doc.lifecycle.stateSchema`, engine-validated per tick). Leaf-wise per phase. |
| **Provider runtime** (`utils.http` + `utils.request`) | v1 `ProviderRuntime` re-homed as host ABI, bound per invocation: `http` = raw ZERO-defaults calls (path resolves against the request origin; headers ARE the outbound set); `request` = the default relay over the compiled request + caller input, presence-based overrides INCLUDING the target — request can do anything http can, they differ only in defaults. Same-origin credential rule + https-only on both (D16); sniff-decoded `{status, body}`; non-2xx returned, transport failures throw EXECUTION_FAILED. |
| **Outcome** | A lifecycle fn's return: `RUNNING{state?, pollAfterMs?}` ∣ `COMPLETED{httpStatus, providerHttpStatus?, output, state?}` — the completed arm IS the raw envelope the settle pipeline consumes. WHOLE-STATE semantics (D21): a present `state` is the complete next fn-state (replaces wholesale); absent carries the previous forward — no field merge. |
| **State** (`zRunState`) | The STRUCTURED envelope threaded between ticks by value: fn-owned `externalRunId`/`stage`/`data` (ids + billing signals, typed when the doc declares `lifecycle.state`) + ENGINE-owned `timing` (the v1 providerRun clock — feeds the ClickHouse provider slices). Hard-capped (`schema.state_max_bytes`). |
| **Timing** (`zRunTiming`) | The settle-side provider-timing report on every RunCompleted (async AND sync): startedAt/completedAt/attempts/startRequestMs/pollMsTotal/providerTotalMs → t_provider_* usage-event slices. Engine-stamped; hosts keep measuring their own slices. |
| **Estimate** (`usage.estimate`) | The pre-run cost hook: validated input → estimated Usage with consolidate's counts KEYS, engine-executed with no IO (`estimate(runInput)`, also `deno task engine:estimate`); absent ⇒ `{counts: {}}` (the PER_CALL posture). `data.usage.model` rides in for provider-seam generic keying (D19/D23). |
| **Model** (`usage.model`) | The rate-free billing ALGEBRA on the doc: LEAF (PER_CALL flat / PER_UNIT metered) and AND (COMPOSITE — scalar components KEYED BY ID; for apify the vendor's charge-event names verbatim). Conditions/offsets/selection are COUNTING rules owned by the fns, never model shapes (D19 — VARIANT deleted). Rates and tier schedules live in the services rate card (D18). |
| **Counts** (`usage.counts`) | The settled/estimated quantities as ONE keyed map for every model type: component id (composite) / the model's unit (leaf PER_UNIT) / `{}` (PER_CALL, error settles). The key is the join across counts ↔ broker card row ↔ drift guard ↔ stashed vendor rates (D19). |
| **Tick** (informal) | One `poll(runInput, state)` activity invocation. |

## D24 — Complete counts vector + deduced estimates (reverses two D18/D19 calls)

Review direction: "it should be counted… and there shouldn't be a default
because all should be deduced." Two reversals, plus labels and the provider
half of the type layer.

**1. Flat components ARE counted — counts is the COMPLETE billed vector.**
On success, `usage.counts` carries EVERY billed component, so
`counts × rates = the whole bill` with no model join (and for apify the
vector maps 1:1 onto the vendor's own charge events): leaf PER_CALL bills
under the reserved `CALL` key (deliberately NOT a Unit); a composite's flat
components bill under their own ids (`{"apify-actor-start": 1, "review":
20}`). The ENGINE appends the flat 1s (`flatCounts(model)`, beside
`countsMismatch`) at estimate AND success settle — fns still never write
flat keys (type layer + countsMismatch keep rejecting them: a fn stating
`"actor-start": 2` is unrepresentable), so the constant has one source.
Error settles stay `zeroUsage()` — `{counts: {}}` is now the ERROR-PATH
shape only.

**2. Estimates are DEDUCED, never defaulted.** A `?? 3` under-holds — the
admission hold is priced from the estimate, and a fallback constant is a
guess. Rules:
- Every METERED doc (≥1 PER_UNIT part in its model) MUST declare
  `usage.estimate` — compile-enforced (HOOK_UNRESOLVED), the old ≥2-metered
  keying rule kept (checked first: more specific diagnosis wins).
- The estimate is PURE ARITHMETIC over the validated input — no fallback
  constants, no presence-branches over billing knobs. A FIXED quantity that
  follows from the vendor's price structure (akta: 1.5 credits per 50
  records) is deduced, not a fallback — cite the evidence.
- Every knob an estimate reads is deterministic post-validation: a schema
  `.default(n)` ONLY where it mirrors the actor's VERIFIED server default
  (`default` in the published input schema — `prefill` is editor-only text
  and justifies nothing), otherwise REQUIRED.
- Required-ness lives AT THE BINDING SITE, never in the schema file:
  `schema/inputs.ts` stays the faithful actor mirror; the endpoint tightens
  with `zBody.required({ "maxItems": true })` (zod keeps inner checks) or
  derives extra floors via `zBody.extend({ f: zBody.shape.f.unwrap().min(1) })`
  — the actor's contract and OUR billing precondition stay separately visible.
- Query arrays feeding multiplication: required + `.min(1)` (or vendor-default
  `[]` materialized when absent ≡ empty on the actor); the `Math.max(len, 1)`
  masks died with the branches.
- Schema defaults now materialize for queryParams/pathParams too (the engine's
  validateInput clones + `useDefaults` across all three input channels — akta's
  `limit` default rides the wire exactly as the vendor would apply it).

**3. Labels — keys stay verbatim, display rides beside.** Model scalars gain
an OPTIONAL `label` (≤40 chars): flat components → "base fee" (exa's model
reads exactly that way), metered → a plain-english plural ("reviews",
"extra results", "content tokens"). Rendering is services-side with the KEY
as fallback (`${label ?? key} × ${count}`); the key is the vendor join and
never changes for display reasons.

**4. Typed provider state.** The slot-override shapes are factored into
shared types (`TypedLifecycleSlots`/`TypedOutputSlots` in typed.ts) composed
by BOTH define fns; `defineProvider<StateSchema>` types the provider's
fn-owned `state.data` bag at read AND write sites (the apify poll stashing
an unprojected pricing card is now a TYPE error — review finding #12 made
unrepresentable). The provider body stays `Json | undefined` (a provider fn
serves every endpoint — D23's documented seam). The apify provider's
own-state reads converted to typed access; a missing `externalRunId` throws
`{retriable: false}` (deterministic corruption → FN_CONTRACT, preserving
the old JsonPathError taxonomy).

### Limit-knob disposition (three-source audit: our schema · live actor input schema · v1 impl)

Decisions: `default n` = actor-published server default pinned in the schema
file; `required` = required-at-binding (no usable server default — prefill-only,
or an "absent/0 = unbounded" sentinel); `deduced` = constant justified by the
vendor's price structure.

| endpoint | knob(s) | decision |
|---|---|---|
| amazon-reviews-scraper | input[] | required (min 1) |
| amazon-product-details-scraper | Params[] | required (min 1) |
| amazon-reviews-extractor | limit ×10 × products[] | default 20; products min 1 |
| amazon-search-scraper | per-item maxPages ×10 | required (nested item field) |
| eu-amazon-sellers-email-leads | max_results | default 100 |
| google-maps-scraper | max_results | default 100 |
| google-shopping-scraper | limit | default 10 |
| google-maps-reviews-scraper | maxReviews × (startUrls+placeIds) | required (published 10000000 is an "all" sentinel); fix: placeIds now counted |
| google-news-scraper-fast | maxArticles × 3 arrays | default 100 (+min 1 floor: 0 = unbounded); arrays default []; fix: topicUrls now counted |
| google-shopping-apify | max_pages × num × queries | defaults 1/[]; fix: multi-query multiplier |
| youtube-channel-business-email-scraper | channels[] | required, minItems 1 (actor-published) |
| youtube-comments-scraper | maxComments × startUrls | default 1 (prefill 10 is editor-only); urls min 1 |
| youtube-scraper | 3 caps × sources | defaults 0/0/0 (literal caps); fix: shorts/streams counted |
| youtube-video-transcript | max_videos / mode | default 10 (D19a, kept) |
| facebook-ads-library-scraper | count (total cap) | required; fix: count replaces limitPerSource (wrong knob) |
| facebook-{comments,groups,reviews}-scraper | resultsLimit × startUrls | required; urls min 1 |
| facebook-pages-scraper | startUrls[] | required (min 1) |
| facebook-profile-posts-scraper | mode textarea + max_posts | required via per-mode discriminated union binding |
| facebook-events-scraper | maxEvents × 2 arrays | required; arrays default [] |
| reddit-scraper-lite | maxItems | default 10 |
| reddit-comment-scraper | maxComments × postUrls | default 100; urls min 1; fix: multiplier was v1's keywords (a filter) |
| apify-reddit-api | maxItems × jobs | default 25; refine ≥1 job; fix: searches counted |
| tiktok-profile-scraper / tiktok-scraper / tweet-scraper | maxItems | required (prefill-only) |
| tiktok-video-scraper | postURLs × (1+related) | urls min 1; D19a defaults kept |
| instagram-{hashtag,post}-scraper | resultsLimit × array | required; array min 1 |
| instagram-search-scraper | searchLimit × comma-terms | required; ≥1 non-empty term |
| instagram-api-scraper | resultsLimit + searchLimit (dual-mode) | both required; refine ≥1 mode |
| premium-x-follower… | mode-gated caps | already required by the actor |
| snapchat-scraper | usernames + relatedProfilesLimit | urls min 1; default 0; fix: related profiles counted |
| snapchat-spotlight-scraper | spotlightUrls | required (min 1) |
| linkedin (6 metered) | maxItems/maxPosts × arrays | all required min 1 (harvestapi reads non-positive as "no limit"); profile-search: maxItems primary, takePages dropped from estimate |
| akta enrichment | sections × 2.5 credits | required; v1 $0.125/section ÷ $0.05/credit |
| akta news | 0.1 + limit × 0.01 credits | default 10 (vendor-documented); v1 rates |
| akta employee-reviews | ceil(limit/50) × 1.5 credits | default 10; v1 increment billing |
| akta product-reviews | products×1.5 / 0.5 list-mode | vendor mode switch, both rates v1-cited |
| akta company/industry-search | 0 credits | free (v1 makePerCallPrice(0)) |
| exa#contents | urls.length | already required |
| octen#embedding | UTF-8 bytes of input[] | v1's exact hold basis |
| octen#extract | urls.length | v1: one credit per URL |
| octen#search / broad-search | tokens floor 0 (+ queries) | content-dependent — settle trues up |

Verification: 134 tests; live pricing survey 46/46; estimate spot vectors
(amazon-reviews `{review: 20, apify-actor-start: 1}` / absent-limit → 200 via
the actor's own default; tiktok-api `{CALL: 1}`; exa `{additional_result: 20,
call: 1}`; akta news `{CREDIT: 0.2}`); two akta#news fixtures URL-updated for
the now-explicit vendor-default `limit=10` (identical semantic request); two
test inputs gained newly-required fields (instagram-api searchLimit 1,
linkedin-by-name maxItems 2) — no re-records needed.

## D25 — FREE billing shape + the required usage triple + input fidelity

**1. FREE is a billing SHAPE, not "0 credits" — and the MODEL is the
free fact.** `zFreeModel` joins the model union as a third leaf
(`{kind: "FREE"}` — kind only: description/label explain derived counts
and price lines, FREE has neither). REVISED per review ("the free field
in usage is very ugly"): `zUsage` carries NO free flag — a FREE doc's
fns return plain `{counts: {}}` and the MODEL interprets. Rules:
  - countsMismatch FREE arm: any counts key from a FREE doc's fns is
    FN_CONTRACT (free bills nothing);
  - freeMismatch (shared, beside countsMismatch): a cost on a FREE doc's
    usage is FN_CONTRACT;
  - the engine's flat-1s completion is a structural no-op for FREE
    (`flatCounts(FREE) = {}`), so the public usage of a free run is
    `{counts: {}}` — consumers read `doc.usage.model.kind === "FREE"`
    to render "free". (The earlier dynamic-free-on-billed-models idea
    died with the flag — a vendor promo is a rate-card fact.)
Remodels: tinyfish provider PER_CALL→FREE (v1: "$0 wins verbatim … both
endpoints are free"); akta company-search + industry-search →FREE (v1
`makePerCallPrice(0)`). exa's `cost` does NOT fold into counts: counts =
card-priceable quantities, cost = the vendor's own money claim — folding
them needs a degenerate usd-pseudo-component and kills the
card-vs-vendor drift check.

**2. The required TRIPLE.** `usage.model` + `usage.consolidate` +
`usage.estimate` are ALL compile-required on the COMPILED DOC — each
resolves endpoint ?? provider, so a provider-level fallback satisfies it
(akta employee/product-reviews inherit the provider's CREDIT settle).
Every doc states its billing story end-to-end: what is chargeable, what
this run will cost, what it did cost. Flat docs state
`estimate: () => ({counts: {}})` (the engine appends the flat 1s); FREE
docs state the same plain shape (the model interprets).

**3. Input fidelity (the standing rules, learned from review edits).**
  - `schema/inputs.ts` is the FAITHFUL VENDOR MIRROR: optionality only —
    never `.default()`, never our floors, unquoted identifier keys. Even
    vendor-documented defaults live at the binding (exa/octen moved).
  - ALL our tightening lives AT THE BINDING, DERIVED from the base
    schema, never restated: `zBody.required({limit: true})` /
    `.extend({f: shape.f.unwrap().default(n)})` / `.unwrap().min(1)`
    floors ONLY where the vendor documents 0/absent = unbounded
    (harvestapi "0 = scrape all", cleansyntax max_posts, compass
    maxReviews sentinel, google-news maxArticles "0 = no limit").
  - Binding policy: the PRIMARY limiting knob is REQUIRED (caller states
    the cap — even when the actor publishes a default); secondary/
    behavior knobs the estimate reads carry binding `.default(verified
    actor default)` (tiktok-video scrapeRelatedVideos/resultsPerPage,
    youtube-transcript max_videos, youtube-scraper shorts/streams,
    snapchat relatedProfilesLimit).
  - Multiplier ARRAYS are never tightened: actor-required stays plain
    (`arr.length`), actor-optional stays optional and the estimate reads
    `arr?.length ?? 0` — HONEST OPTIONALITY, not a fallback. Empty/absent
    ⇒ estimate 0 (deduced ≠ non-zero). All the D24 `.min(1)` array
    floors and mode-`refine`s died; facebook-profile-posts' invented
    discriminated-union binding reverted (never invent structure the
    mirror doesn't have — count at the granularity the mirror states).
  - youtube-scraper 0-semantics VERIFIED live: the actor's own startUrls
    description says "If you only want to scrape shorts/streams, set
    Maximum search results to 0" ⇒ 0 is a literal cap, not a sentinel —
    required, no floor.

**4. Typed queryParams + pre-toRequest estimates.** `defineEndpoint`
gains a QuerySchema generic (`TypedRunInput<B, Q>`); akta estimates read
`data.input.queryParams.limit` directly. SOUNDNESS FIX riding along: the
estimate ctx now receives the PRE-toRequest validated input — the
estimate is a promise about the CALLER's request, and akta's toRequest
CSV-joins arrays (post-toRequest typing would lie). Envelope/lifecycle
ctxs keep the wire-shaped input; providers with reshaping toRequest fns
must not rely on typed input there (akta's consolidates read output
only).

**5. akta remodels — quantities, not credit arithmetic.** news →
COMPOSITE {request PER_CALL "base fee", article PER_UNIT·RESULT
"articles"} with a doc-level consolidate (articles delivered off
`$.data`; `credits_consumed` as cost basis + evidence); enrichment →
PER_UNIT·RESULT "sections" (estimate = requested sections, settle =
delivered sections off the response's section-keyed `data`);
employee-reviews + product-reviews KEEP CREDIT (the vendor bills whole
credit increments and exposes no block quantity to settle against —
credits ARE its native meter there); limits REQUIRED at bindings
("just make it required — simpler").

## D26 — Consumption-aware usage models: the def IS the rate card
(reverses D18's "no rates in docs")

**1. The reversal, and why it's safe now.** D18 kept rates out of docs
because apify event prices tier by OUR subscription plan — a
services-side fact. What the fleet work since proved: the TIER is one
provider-wide constant (GOLD), the per-line prices are vendor-published
facts we already survey live, and keeping them elsewhere split the rate
card from the model that names its lines — every broker join and every
audit had to re-derive the pairing D19 built the ids for. So the def
becomes the rate card: every billable line pins what it CONSUMES, and
the drift guard's job widens from "the ids still exist" to "the pinned
amounts still match live" (survey v3, GOLD-tier
`eventTieredPricingUsd.GOLD.tieredEventPriceUsd ?? eventPriceUsd`,
joined on `vendor ?? id`). A vendor repricing now fails a CI task
instead of surfacing on an invoice.

**2. Credit systems.** `usage.credits` sits BESIDE `usage.model`:
`Record<creditId, {label?, description?}>`, resolved provider ??
endpoint (OPPOSITE of hooks — the pool is a provider-wide fact; an
endpoint declares one only when the provider has none). Single-pool
providers use id `default` unquoted (akta "Akta credits", octen "Octen
credits", exa + apify "US dollars" — a dollar-priced vendor's pool IS
dollars). Compiled-doc `usage.credits` is REQUIRED — `{}` for FREE, and
an endpoint-level declaration on a FREE doc is a compile error (dead
config). Compile checks: credits must resolve for billable models, every
`consumes.credit` references a declared id, no declared id goes
undrained.

**3. Model lines consume.** Every billable line (PER_CALL + PER_UNIT,
leaf or composite component) REQUIRES `consumes: {credit, amount}`.
PER_UNIT gains model-level `every` (int ≥ 1, `.default(1)` materialized
at parse — the define generic constrains on `UsageModelSeed` = z.input,
since seed and output diverge on the default) for block rates (octen "1
credit per 1000 tokens" → `every: 1000`; akta employee-reviews blocks of
50). Optional `vendor` carries the vendor's native line name when it
differs from OUR snake_case id (apify `actor_start` ← "actor-start",
leaf lines pin the joined charge event explicitly). Component ids are
OURS now — snake_case, unquoted — the vendor spelling is a FIELD, not
the key (revises D19's verbatim-key rule; the join survives as
`vendor ?? id`).

**4. Public usage = {credits, evidence}.** Exactly two facts, both
re-derivable: `credits` (per-pool consumption — the priced vector) and
`evidence` (per-line quantities, flat 1s included). NO cost, NO receipt
blobs, NO free flag: vendor receipts live in the RAW run record (the
receipt IS the output — hosts persist the envelope), and anyone holding
the doc re-derives credits from evidence × the model's every/amount.
Fns return `zFnUsage = {counts}` — quantities per metered line only, no
rate math, no receipt plumbing. `zeroUsage()` → `{credits: {},
evidence: {}}` (error settles); `defaultFnUsage()` → `{counts: {}}`.

**5. The engine owns the fold.** `flatLines(model)` (renamed from
flatCounts; CALL_KEY survives as the leaf-flat evidence line id) +
`creditsOf(model, quantities)` (`ceil(q / every) × amount` per line —
whole increments — summed per credit id; FREE → `{}`) +
`assembleUsage(model, fnCounts)` live beside the schema in
`usage/validate.ts`; the engine applies the assembly at estimate AND
success settle. `freeMismatch` is DELETED (no cost field left to
reject); `countsMismatch` unchanged. `deno task engine:estimate` prints
the folded `{credits, evidence}` — pre-run pricing with no broker.

**6. Fleet remodels (v1 rate evidence).**
  - akta: provider declares the pool; the provider-level CREDIT settle
    DIES — endpoints own their settles. enrichment prices its 16
    sections individually (0.5–5 credits — the CLI/MCP pricing tables);
    news = request 0.1 + article 0.01; employee-reviews PER_UNIT·RESULT
    `every: 50` × 1.5 (settles the REQUESTED limit — the vendor bills
    whole increments regardless of delivery); product-reviews COMPOSITE
    product 1.5 / list_lookup 0.5, mode-selected off the post-toRequest
    CSV.
  - exa: search = call $0.007 + additional_result $0.001 above 10;
    contents = $0.001/page. The old cost/receipt plumbing (costDollars,
    requestId picks) is gone — costDollars stays absorbed from the
    user-facing output but lives in the raw record.
  - octen: search = call 1cr + full_content_tokens 1cr/1000; broad-search
    = receipt_queries 1cr + full_content_tokens 1cr/1000; extract =
    1cr/URL; embedding becomes a MODE-SELECTED composite (embedding_0_6b
    10cr/M, embedding_4b 40cr/M, embedding_8b 70cr/M — vendor model
    names in `vendor`).
  - apify: all 46 docs pin their GOLD-tier per-event dollars; the two
    profile-search-by-* docs shed their v1 flat worst-case $0.01/result
    hold for the sibling's mode-selected composite (the known open
    follow-up on their billing basis).

## D27 — Subclassing settles: usage.evidence + the vendor-meter consolidate

**1. Two settle fns, names that mean what they do.** The pre-D27
"consolidate" did two jobs — derive quantities AND strip the vendor's
billing field — which forced endpoints to repeat the strip whenever they
overrode the counting. Split, with the WORD going back to its original
job:
  - `usage.evidence(envelope) → {counts}` — per-line QUANTITIES (the
    old fn renamed to the thing it produces, its return slimmed: no
    wrapper, no output slot). Mirrors `estimate`, the same shape
    pre-run: estimate promises evidence, evidence settles it, both feed
    the public `usage.evidence` field — the same declaration→output
    naming `usage.credits` already had. Endpoint-DIVERGENT.
  - `usage.consolidate(envelope) → {credits, output?}` — the VENDOR'S
    OWN METER, lifted out of the payload in one motion
    (`utils.json.pluck(json, path) → {value, rest}` — new ABI util so
    read + remove is one expression). Provider-UNIFORM: where the
    vendor puts its meter is a provider-wide fact, so the strip is
    written once (akta credits_consumed, exa costDollars, apify
    usageTotalUsd-in-state; octen has no total — its consolidate claims
    `{}` and only strips the meta.usage receipt). OPTIONAL on the
    compiled doc.

**2. Reported wins; the fold is the check.** At success settle:
evidence → flat 1s appended → derived fold (D26, unchanged). Then, if a
consolidate fn resolved: zero entries prune (0 = nothing consumed; the
FREE lookups' `credits_consumed: 0` prunes to an empty claim), an
all-empty claim falls back to the derived fold, and a NON-EMPTY claim
WINS — `usage.credits` IS the vendor's number, our rate card demoted to
fallback + always-on cross-check. Disagreement beyond 1e-9 rides out as
`usage.mismatch.derived` (only OUR number — `credits` already holds the
vendor's) — said, logged, never failing the run. Claim pool ids must be
DECLARED credit systems (FN_CONTRACT — a nonzero claim on a FREE doc
trips loudly). The public interface stays `{credits, evidence}` plus the
one signal; fns omit unreported entries (never `?? 0`). Error settles
stay `zeroUsage()` — no meter read. The apify posture upgrades: the
survey guards rates BETWEEN runs, the mismatch signal guards them ON
EVERY run.

**3. Subclassing: endpoint ?? provider, and the compiler fills the
forced move.** Resolution stays two-level (provider default, endpoint
override). When NEITHER declares estimate/evidence AND the model has no
metered lines (FREE / flat — `hasMeteredLines`), the compiler
SYNTHESIZES the one lawful fn `() => ({counts: {}})` into the doc: a
real interned fnTable entry (`core#usage.synthesizedEmpty`, one entry
repo-wide), so the compiled doc stays comprehensive — model/credits/
estimate/evidence all REQUIRED, consolidate present exactly when the
vendor reports a meter. Metered models must still resolve both
quantities fns (HOOK_UNRESOLVED — the deduced-estimate guarantee,
unchanged); ≥2-metered composites still force DOC-level ownership.
`presets.usage.perCall` DIES: a flat doc's settle is a forced move, so
there is nothing to author at all. Note the resolution order means a
provider-declared generic evidence serves even FREE docs (akta's
returns `{counts: {}}` for them — behavior-identical to synthesis;
synthesis fires only when no level declares).

**4. Fleet.** akta: provider consolidate (pluck credits_consumed) +
generic model-keyed evidence (delivered = len($.data) under the sole
metered line — v1 providerFormatOutput + getActualCost reborn as two
one-job fns); FREE pair shrink to `model: FREE` alone; news drops its
settle entirely (provider default is behavior-identical); enrichment
(section-keyed data), product-reviews (CSV mode), employee-reviews
(REQUESTED-limit basis — now cross-checked by the claim on every real
run) keep only their divergent evidence fns. exa: provider consolidate
plucks costDollars; endpoint fns lose their strips. apify: provider
consolidate claims stashed usageTotalUsd; generic counts fn renamed to
evidence; the two flat docs' boilerplate estimates die (synthesis).
tinyfish: provider fns die (model alone). octen: strips hoisted to one
provider consolidate; four evidence renames. `engine:estimate` prints
just the answer — `{credits, evidence}` (model and pools live on the
doc).

## D28 — One drift command; the vendor field dies for a derived join

**1. Drift vs tests, made structural.** TESTS answer "is our code
right?"; DRIFT answers "has the vendor's world moved out from under our
pinned defs?" — a repricing failing `deno task test` looks like our bug
and isn't. The two apify guards that lived in different vehicles
(`apify:pricing` task + the `schema-drift.test.ts` live test) merge into
ONE command, `deno task drift [--provider] [--fix]`: a generic runner
(scripts/drift.ts) over per-provider SUITES (scripts/drift/<provider>.ts
— NOT connectors/, which stays closed-term defs the compiler consumes).
The apify suite polls each actor once and checks pricing (regime, shape,
line join, GOLD-tier rates) AND input schemas (live.required ⊆
compiled.required — the caller-breaking direction only). A suite exists
only where the vendor publishes a machine-readable surface; for the
rest, the runner PRINTS the coverage story per provider (guarded by
test:live response shapes + the D27 run-time mismatch signal) — explicit,
never silent. Scheduled: .github/workflows/drift.yml (weekly cron +
dispatch, APIFY_API_KEY secret) — the repo's first workflow.

**2. The fix policy — generated vs pinned.** `--fix` rewrites GENERATED
artifacts only: schema drift re-runs the scaffold codegen for the
drifted actors (git diff is the review gate). HAND-PINNED assertions
stay alarm-only: rates are reviewed claims about what we're willing to
pay — auto-rewriting `consumes.amount` from live prices would be exactly
the silent repricing the guard exists to catch. Instead the suite emits
`.output/drift-repin.json` (doc → line → pinned vs live): applying it is
mechanical but deliberate.

**3. vendor dies; the join is DERIVED (revises D26).** The `vendor`
field was dead at runtime — no fn read it; its one consumer was the
survey's line↔event join. But composite line ids were MINTED from the
vendor names by one deterministic transform, so the suite applies the
SAME transform to the LIVE names at check time
(`normalizeEventName`: strip the `apify-` prefix, kebab/dot/camelCase →
snake — unit-pinned against every naming style the fleet publishes) and
the field carries no information the id doesn't. Leaf lines (id = the
unit — no name relationship) fall back to AMOUNT-EXISTENCE: the pinned
amount must appear among the actor's live prices. Accepted degradations,
eyes open: a leaf rename reports as "rate vanished" (not "renamed"), and
a same-price collision can mask a single leaf repricing
(facebook-pages publishes two events at 0.0054). Docs keep a
`// vendor charge event: "…"` COMMENT on leaf lines where the reader
would otherwise have no trail from RESULT to the vendor's row.

## D29 — Honest apify pricing: effective rates, input-gated completeness,
output schemas

**1. Effective pricing + scheduled-pin reconciliation.** `pricingInfos`
is a HISTORY whose last entry can be a FUTURE scheduled pricing — the
suite validated eu-amazon's pin against a change effective 2026-09-17
while a different price billed today (caught by review). The suite now
checks against the pricingInfo that bills TODAY (latest
`startedAt <= now`) and RECONCILES scheduled changes: a pin matching an
upcoming price passes with an UPCOMING notice + a repin-report entry
carrying `effectiveAt` — a known future change never breaks CI or
forces a flip-flop commit (the eu-amazon pin deliberately stays at the
scheduled 0.0079; estimates over-hold by 0.001/result until the flip —
conservative, and the D27 claim settles the true bill). "GOLD" is just
apify's API code for our BUSINESS plan's discount tier — comments now
say Business-tier.

**2. The completeness rule, enforced mechanically.** An input-gated
line the model omits makes estimates silently wrong the moment that
input is used — review found 13 actors declaring 1-of-N published
lines. The rule: every published billable event is MODELED or in the
suite's documented EXCLUDED map ("we don't bill that" is a reviewed
claim, never an accident) — a `coverage` finding otherwise. The 13
remodels: youtube-scraper (date_filter + two AI per-minute lines +
transcribe_minute), tiktok-video-scraper (video_download +
transcription_minute), youtube-channel-email (force-fresh surcharge),
linkedin-company-employees (mode trio — the vendor's enum values embed
its FREE-tier prices verbatim, mirrored faithfully),
linkedin-profile-posts + linkedin-post-search (reactions/comments/
no_result + post-search enrichment; post-search's full-profile event
has NO live input that selects it — modeled for coverage, never
promised), instagram-api-scraper (search_result at its own HIGHER rate
— the flagged under-hold — + filter_applied), instagram-profile
(about_account), instagram-post (post_details — bills by DEFAULT:
dataDetailLevel defaults "detailedData"), instagram-search
(live_search_result), facebook-groups + facebook-comments
(filter_applied), plus by-name's page size fixed to ceil(maxItems/10)
(the actor's own event description: "up to 10 short profiles" — the
sibling's 25 was wrongly copied; independently confirmed by the
pricing-page README via the exa triple-check). Estimate discipline:
gated lines are PROMISED when their input switches them on — deducible
quantities at the input caps, response-dependent quantities (minutes,
no_result) at the D24 floor 0 (the LINE still appears, so holds
acknowledge the add-on); evidence settles per-minute lines from item
durations ("HH:MM:SS") and splits items by type/mode fields, absent
where genuinely unattributable (the D27 claim is the credits truth).

**3. Output schemas (19 actors).** Where an actor PUBLISHES
`storages.dataset.fields`, the scaffold now emits `schema/output.ts`
and the doc declares `output.schema` — passthrough DOCUMENTATION:
non-strict, every field optional (`required` stripped), and the array
accepts `item.or(record)` so validation is UNFAILABLE by construction
(a paid run can never die on vendor field drift; the typed branch is
the documentation). The drift suite reports live field
additions/removals informationally. `apify:scaffold --output-only`
refreshes without touching curated inputs.

**4. Verification.** Live drift 46/46 with coverage active (one
UPCOMING notice — eu-amazon, by design); exa-scraped pricing pages
(via treg, $0.017) independently confirm every pasted actor's Business
headline price including eu-amazon's effective $6.90/1k; drift-suite
unit tests pin selectPricing/reconciliation/coverage on the real
eu-amazon shape.
