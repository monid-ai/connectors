# connector-schema (delta)

## ADDED Requirements

### Requirement: Three-part hook ctx
EVERY hook fn SHALL take one ctx `{data, utils, logger}` — `logger` is a
`HookLogger` (debug/info/warn/error), its own ctx member, never inside
utils. The auth hook's logger is silent by construction (credentials in
scope).

#### Scenario: Logger reaches a hook
- **WHEN** any hook fn calls ctx.logger.info
- **THEN** the message routes to the host's EngineCtx.logger (no-op default)

### Requirement: Run kinds defined once, UPPERCASE
`RunKind = {RUNNING: "RUNNING", COMPLETED: "COMPLETED"}` (run/state.ts)
SHALL be the ONE kind vocabulary shared by fn outcomes and engine results
(v1 zProviderRunStatus convention). Kinds are HOST protocol verbs —
append-only, engine minor bump to extend; endpoint-specific phases ride
`state.stage`, never new kinds.

#### Scenario: Fn outcome and engine result agree on kinds
- **WHEN** a lifecycle fn returns kind "RUNNING"
- **THEN** the engine result discriminates on the same literal

### Requirement: Structured run state (zRunState / zStatePatch)
`zRunState` SHALL be the structured envelope threaded between ticks:
fn-owned `externalRunId?` (non-empty string — the vendor's run id, ↔ v1
providerRunId), `stage?` (free-form dispatch marker), `data?` (Json bag)
plus ENGINE-owned `timing` (`zRunTimingInFlight`: startedAt,
startRequestMs, lastPolledAt?, attempts, pollMsTotal, deadlineAt — ISO
strings, payload-safe). Lifecycle fns SHALL return `zStatePatch`
(the three fn-owned fields only — no timing field exists to tamper with);
merge is presence-based (`{}` keeps everything; `data` replaces
wholesale).

#### Scenario: Patch cannot carry timing
- **WHEN** a fn outcome's state includes a `timing` key
- **THEN** the strict patch schema rejects it (FN_CONTRACT)

### Requirement: Settle-side timing report (zRunTiming)
`zRunCompleted` SHALL carry a required `timing: zRunTiming`
({startedAt, completedAt, attempts, startRequestMs, pollMsTotal,
providerTotalMs}) — the provider slices of the v1 ClickHouse latency
waterfall, present on sync AND async completions so hosts emit usage
events uniformly.

#### Scenario: Sync run reports timing
- **WHEN** a declarative (no-lifecycle) run completes
- **THEN** the result carries timing with attempts 0 and pollMsTotal 0

### Requirement: Lifecycle hook family contracts
The schema SHALL define the effectful lifecycle hook family
(`hooks/lifecycle.ts`): `LifecycleStartFn` (`ctx.data = {input, request}`),
`LifecyclePollFn` and `LifecycleStopFn` (`ctx.data = {input, request,
state: zRunState}` — fns READ engine timing, return patches), each async,
each receiving `LifecycleUtils` = the pure ABI (`json`, `money`) plus
`http` (zHttpCall: method + exactly one of https-only url | path +
headers?/queryParams?/body?/requestMs? — ZERO defaults, headers ARE the
outbound set) and `request` (the default relay: zRequestOverrides —
presence-based overrides INCLUDING the target url|path, at most one).
The shared outcome union SHALL be `{kind: RUNNING, state: zStatePatch,
pollAfterMs?} | {kind: COMPLETED, httpStatus, providerHttpStatus?,
output, state?: zStatePatch}`.

#### Scenario: HttpCall shape is validated
- **WHEN** a lifecycle fn calls utils.http with both `url` and `path` (or neither, or an http:// url)
- **THEN** the call is rejected

### Requirement: Lifecycle def section, typed state, doc field, fn-key closure
`zEndpointDef` and `zProviderDef` SHALL carry an optional
`lifecycle: {start?, poll?, stop?, state?}` section — `state` holds a LIVE
zod schema (zSchemaCarrier) typing the fn-owned `data` bag. `zEndpointDoc`
SHALL carry an optional `lifecycle: {start: FnRef, poll?: FnRef, stop?:
FnRef, stateSchema?: JsonSchemaDoc}`; `fnKeysOf` SHALL include every
lifecycle ref, so sealed units and the bundle fnTable closure cover the
family.

#### Scenario: Sealed unit closes over lifecycle fns
- **WHEN** a doc with lifecycle {start, poll, stop} is sealed
- **THEN** the unit's fns contain entries for all three refs

### Requirement: Engine-side running result derived from the fn outcome
`zRunRunning` SHALL be `zLifecycleRunning.extend({state: zRunState,
pollAfterMs: positive int})` — ONE definition plus what the engine ADDS at
the boundary (full state incl. timing; resolved cadence). No
`providerRunId` field: the handle lives at `state.externalRunId`.

#### Scenario: Running result round-trips
- **WHEN** a RUNNING result with full state (incl. timing) is parsed
- **THEN** zRunResult accepts it

### Requirement: Envelope carries the final lifecycle state
`zEnvelopeData` SHALL gain optional `state: Json` so `usage.consolidate`
and `output.fromResponse`/`fromError` on lifecycle docs can read billing
signals stashed during polling (under `$.data.*` in the structured
state). Sync docs are unaffected (field absent).

#### Scenario: Consolidate reads poll-stashed signals
- **WHEN** a lifecycle run completes with state.data `{usageTotalUsd: 0.01}`
- **THEN** the consolidate fn reads it at `$.data.usageTotalUsd`

### Requirement: Unit vocabulary — countables only, UPPERCASE, no CALL
`Unit` SHALL hold only COUNTABLE quantities (RESULT, TOKEN, CHARACTER,
SECOND, MINUTE, CREDIT, PAGE) with UPPERCASE keys AND values (the repo
enum rule; lowercase is display-only). CALL SHALL NOT be a unit: a flat
charge is the PER_CALL model kind, never a measure. `zUsage.units` MAY be
EMPTY — the canonical "nothing counted": PER_CALL settles, all zero/error
paths (`zeroUsage()`/`defaultUsage()` return `{units: []}`,
`presets.usage.perCall()` settles `{usage: {units: []}}`).

#### Scenario: Zero is unit-agnostic
- **WHEN** a provider error forces zero usage
- **THEN** the settled usage is `{units: []}` — no fake measure of any unit

### Requirement: usage.model — the rate-free billing ALGEBRA
`zUsageModel` SHALL be the discriminated union of three orthogonal
operators, one kind per file under `usage/model/` with the runtime kind
enum DERIVED from the union (extractZodDiscriminatorKeys — the v1
zPriceTypes pattern; a literal-typed authoring const is kept in sync by a
load-time staleness guard):
- LEAF: `PER_CALL` ({kind} only — billed 1 iff success, no measure) and
  `PER_UNIT` ({kind, unit} — metered per N of unit; pure, no base-fee
  side pocket);
- AND: `COMPOSITE` ({kind, components: scalars, min 2}) — the SUM of
  scalar components; at most one PER_CALL, distinct PER_UNIT units, no
  nesting (the v1 leaf rule);
- SELECT: `VARIANT` ({kind, unit, selectors}) — request coordinates pick
  WHICH card row prices the unit (request-side zModelSelector only).
No TIERED kind: volume schedules are services card-row shapes, invisible
to a rate-free doc. No rate field anywhere: apify event prices are tiered
by OUR subscription plan (verified), so rates are services config.
`zUsageSection` carries `model?` (and `estimate?`); `doc.usage` carries
`model` inline (hash-covered) and `estimate` as a FnRef.

#### Scenario: Composite constraints enforced
- **WHEN** a model declares COMPOSITE with two PER_CALL components (or two PER_UNIT components of the same unit)
- **THEN** the schema rejects it

#### Scenario: Estimate preset applied
- **WHEN** an endpoint declares presets.estimate.limitIsExact([...fields], 3)
- **THEN** the compiled doc references one interned factory entry with the fields as args

### Requirement: Coded JSON path errors
`utils.json` lookups SHALL throw `JsonPathError` with `code`
(PATH_SYNTAX | PATH_NOT_FOUND | TYPE_MISMATCH) and `retriable = false` —
a deterministic fn bug catch sites can classify without string-matching.

#### Scenario: Strict read on an absent path
- **WHEN** json.num reads a missing path
- **THEN** a JsonPathError with code PATH_NOT_FOUND (retriable false) is thrown

### Requirement: Timeouts gain the poll cadence
`zTimeouts` (doc) and `zTimeoutsSection` (def) SHALL gain optional
`pollMs`; contract config SHALL expose `schema.async_since`,
`schema.state_max_bytes`, and `compiler.defaults.poll_interval_ms`.

#### Scenario: Sync docs never carry pollMs
- **WHEN** a doc without lifecycle.poll is compiled
- **THEN** its timeouts lack `pollMs`
