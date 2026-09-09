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
charge is the PER_CALL model kind, never a count.

### Requirement: usage.counts — ONE keyed map for every model type
`zUsage.counts` SHALL be a plain `Record<string, number>` (zMeasure is
DELETED — design D19) whose key names WHAT is counted: the component id
for a COMPOSITE doc (metered components only — a flat component never
appears; model + success covers it); the model's unit for a leaf
PER_UNIT doc (`{"RESULT": 10}`); `{}` for PER_CALL docs and every
zero/error path (`zeroUsage()`/`defaultUsage()` return `{counts: {}}`,
`presets.usage.perCall()` settles `{usage: {counts: {}}}`). The key is
the join across counts, the broker card row, the drift guard and (apify)
the vendor's own charge-event names — per-event prices match exactly.

#### Scenario: Zero counts nothing
- **WHEN** a provider error forces zero usage
- **THEN** the settled usage is `{counts: {}}` — no fake count of any kind

#### Scenario: Composite counts key the component
- **WHEN** facebook-comments-scraper settles 23 dataset items
- **THEN** the usage is `{counts: {"comment": 23}}` — the actor's charge-event name verbatim

### Requirement: usage.model — the rate-free billing ALGEBRA
`zUsageModel` SHALL be the discriminated union of two operators, one kind
per file under `usage/model/` with the runtime kind enum DERIVED from the
union (extractZodDiscriminatorKeys — the v1 zPriceTypes pattern; a
literal-typed authoring const is kept in sync by a load-time staleness
guard):
- LEAF: `PER_CALL` ({kind, description?} — billed 1 iff success, no
  count) and `PER_UNIT` ({kind, unit, description?} — metered per N of
  unit; pure, no base-fee side pocket). `description` is a human note on
  what a derived count means; documentation only, never a join key.
- AND: `COMPOSITE` ({kind, components: `Record<componentId, scalar>`,
  min 2}) — scalar components KEYED BY ID (design D19): id uniqueness is
  structural, and the old constraints (≤1 PER_CALL, distinct PER_UNIT
  units) are DELETED — the key disambiguates, so two flat rates
  (tiktok-comments) and two same-unit rates (linkedin) are representable.
  No nesting.
No VARIANT kind (deleted — design D19) and no TIERED kind: conditions,
offsets and input-selection are COUNTING rules owned by the
consolidate/estimate fns (a gated line counts 0 when off; a select-one
populates only the selected key; exa's base-covers-first-10 is
`max(0, n − 10)`); volume schedules are services card-row shapes. No
rate field anywhere: apify event prices are tiered by OUR subscription
plan (verified), so rates are services config. `zUsageSection` carries
`model?` (and `estimate?`) per level — but the model MUST RESOLVE
(endpoint ?? provider, compile error if neither: every doc declares what
is chargeable); `doc.usage` carries the resolved `model` REQUIRED inline
(hash-covered) and `estimate` as a FnRef.

#### Scenario: Same-unit components are legal, keyed
- **WHEN** a composite declares full-profile and full-profile-with-email (both RESULT)
- **THEN** the model validates — the ids disambiguate what the old distinct-unit rule forbade

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

### Requirement: Endpoint PUBLIC identity — the def's native path (D22)
`zEndpointDef` SHALL carry an optional `endpoint` field: a native PATH
(leading `/`, lowercase segments) that IS the public endpoint identity.
Absent ⇒ `request.path` with trailing slashes stripped. The compiled doc
SHALL carry the resolved `endpoint` and derive
`id = provider# + endpoint.slice(1)` — folder names are organizational
only and never mint identity. apify docs pin the actor slug path
(`/{owner}/{name}`, derived from `/v2/acts/{owner}~{name}/runs`);
tinyfish pins explicitly (its `request.path` is "/").

#### Scenario: Default identity from the native path
- **WHEN** exa#search declares no endpoint field and request.path "/search"
- **THEN** the doc compiles with endpoint "/search" and id "exa#search"

#### Scenario: Pinned identity for transport-plumbing paths
- **WHEN** an apify def pins endpoint "/apidojo/tweet-scraper"
- **THEN** the doc id is "apify#apidojo/tweet-scraper" (the actor's own slug, v1 parity)

### Requirement: Typed authoring — model keys and input bodies (D19a/D22)
`defineEndpoint` SHALL be generic over the declared model and the input
body schema (types only; zod stays the runtime truth): the doc's own
consolidate/estimate return counts keyed by the model's LITERAL metered
keys (a typo'd key, a flat-component key, or a counting preset on a flat
doc fails the typecheck — the flat doc's estimate slot is `never`), and
`data.input.body` is typed by the doc's OWN input schema (sound: the
engine validates the same schema before any hook). The runtime twin
`countsMismatch` SHALL live beside the usage schema as ONE exhaustive
switch (`satisfies never` default) shared by the engine and tests.

#### Scenario: Typo'd counts key fails the typecheck
- **WHEN** a composite doc's estimate returns counts keyed "commnet"
- **THEN** `deno task check` fails at the doc site (proven by ts-expect-error tests)

#### Scenario: Counting preset on a flat doc fails the typecheck
- **WHEN** a PER_CALL doc declares estimate: presets.estimate.limitIsExact(…)
- **THEN** `deno task check` fails — nothing is assignable to the `never` slot
