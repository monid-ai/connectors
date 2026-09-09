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
- **THEN** the consolidate fn reads it off `data.lifecycle.state` at `$.data.usageTotalUsd` (or via the typed bag when the doc declares `lifecycle.state`)

### Requirement: Unit vocabulary — countables only, UPPERCASE, no CALL
`Unit` SHALL hold only COUNTABLE quantities (RESULT, TOKEN, CHARACTER,
SECOND, MINUTE, CREDIT, PAGE) with UPPERCASE keys AND values (the repo
enum rule; lowercase is display-only). CALL SHALL NOT be a unit: a flat
charge is the PER_CALL model kind, never a count.

### Requirement: usage.counts — the COMPLETE billed vector (D24)
`zUsage.counts` SHALL be a plain `Record<string, number>` (zMeasure is
DELETED — design D19) that, on SUCCESS, carries EVERY billed component —
`counts × rates = the whole bill`, no model join: the metered component
ids (composite) or the model's unit (leaf PER_UNIT, `{"RESULT": 10}`)
carry the fn-settled quantities, and every FLAT charge is ENGINE-appended
at exactly 1 (`flatCounts(model)`, applied at estimate AND success
settle): a composite's PER_CALL components under their own ids
(`{"apify-actor-start": 1, "review": 20}`), a leaf PER_CALL model under
the reserved `CALL` key (NOT a Unit). FNS never write flat keys — the
type layer and `countsMismatch` reject them, so the constant has one
source. `{counts: {}}` is the ERROR-PATH shape only (`zeroUsage()`
unchanged: nothing billed, nothing counted). The key is the join across
counts, the broker card row, the drift guard and (apify) the vendor's
own charge-event names — the vector maps 1:1 onto vendor charge events.

#### Scenario: Zero counts nothing
- **WHEN** a provider error forces zero usage
- **THEN** the settled usage is `{counts: {}}` — no fake count of any kind, no flat 1s

#### Scenario: Composite settles the complete vector
- **WHEN** facebook-comments-scraper settles 23 dataset items
- **THEN** the usage is `{counts: {"comment": 23, "actor-start": 1}}` — metered fn-settled, flat engine-appended

#### Scenario: Leaf flat bills under CALL
- **WHEN** tinyfish#fetch (leaf PER_CALL) succeeds
- **THEN** the usage is `{counts: {"CALL": 1}}` — engine-derived, no estimate fn needed

#### Scenario: A fn writing a flat key fails closed
- **WHEN** a consolidate returns `{"actor-start": 2}`
- **THEN** FN_CONTRACT (and the typed layer rejects it at `deno task check`)

### Requirement: usage.model — the rate-free billing ALGEBRA
`zUsageModel` SHALL be the discriminated union of two operators, one kind
per file under `usage/model/` with the runtime kind enum DERIVED from the
union (extractZodDiscriminatorKeys — the v1 zPriceTypes pattern; a
literal-typed authoring const is kept in sync by a load-time staleness
guard):
- LEAF: `FREE` ({kind} only — never bills, design D25: no description/
  label, the kind says everything; never a composite component),
  `PER_CALL` ({kind, label?, description?} — billed 1 iff success,
  engine-counted under its key — design D24) and `PER_UNIT` ({kind, unit,
  label?, description?} — metered per N of unit; pure, no base-fee side
  pocket). `description` is a human note on what a derived count means;
  `label` (≤40 chars, OPTIONAL) is a SHORT display name for billing
  surfaces ("base fee", "reviews", "extra results") — rendering is
  services-side with the KEY as fallback (`${label ?? key} × ${count}`);
  neither is ever a join key.
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
is chargeable), and `usage.estimate` must resolve on EVERY doc (design D25
— the required billing TRIPLE: model + estimate + consolidate state
what is chargeable, what this run will cost, and what it did cost; a
flat doc's estimate states `{counts: {}}`, a FREE doc's states
`{counts: {}, free: true}`). `doc.usage` carries the resolved `model`
REQUIRED inline (hash-covered) and `estimate` as a FnRef.

#### Scenario: Doc without an estimate fails compile
- **WHEN** a doc resolves neither an endpoint- nor provider-level usage.estimate
- **THEN** compile fails HOOK_UNRESOLVED citing the D25 billing triple

### Requirement: FREE usage — the MODEL is the free fact (D25)
Free-ness SHALL live in the MODEL only — `zUsage` carries NO free field.
A FREE-model doc's estimate and consolidate return plain `{counts: {}}`
(nothing counted; the countsMismatch FREE arm rejects any key) and never
a cost (`freeMismatch`, shared beside countsMismatch). The engine's
flat-1s completion is a structural no-op for FREE (`flatCounts(FREE) =
{}`), so the public usage of a free run is `{counts: {}}` — consumers
read the DOC's model (`kind: "FREE"`) to render "free".

#### Scenario: FREE doc settles empty
- **WHEN** tinyfish#fetch (model FREE) succeeds
- **THEN** the usage is `{counts: {}}` — no CALL key, no cost; the doc's model says free

#### Scenario: FREE doc counting fails closed
- **WHEN** a FREE doc's consolidate returns any counts key (or a cost)
- **THEN** the run fails FN_CONTRACT — free bills nothing

#### Scenario: Same-unit components are legal, keyed
- **WHEN** a composite declares full-profile and full-profile-with-email (both RESULT)
- **THEN** the model validates — the ids disambiguate what the old distinct-unit rule forbade

#### Scenario: Composite constraints enforced
- **WHEN** a model declares COMPOSITE with two PER_CALL components (or two PER_UNIT components of the same unit)
- **THEN** the schema rejects it

#### Scenario: Typed inline estimate compiled
- **WHEN** an endpoint declares an inline estimate reading `data.input.body.maxItems ?? 3`
- **THEN** the compiled doc references one interned fn entry (kind "fn"), and a typo'd field name fails `deno task check` at the doc site

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

### Requirement: Typed authoring — model keys, inputs, lifecycle state (D19a/D22/D23/D25)
`defineEndpoint` SHALL be generic over the declared model, the input
body AND queryParams schemas, and the lifecycle state schema (types
only; zod stays the runtime truth): the doc's own consolidate/estimate
return counts keyed by the model's LITERAL metered keys (a typo'd key or
a flat-component key fails the typecheck; a flat doc's estimate can
promise only `{}`; a FREE doc's fns must return `{counts: {}, free:
true}` and a billed doc's estimate cannot promise `free` — `free?:
never`); `data.input.body` / `data.input.queryParams` are typed by the
doc's OWN schemas; and the fn-owned `state.data` bag is typed by the doc's OWN
`lifecycle.state` schema at BOTH the read sites (`data.lifecycle.state`
in tick/envelope ctxs) and the write sites (lifecycle outcome `state`) —
sound in every case because the engine validates the same schema on the
same boundary before a fn sees the value. Raw vendor output SHALL stay
`Json` (no doc-declared schema describes the raw envelope — billing
anchors to it BEFORE fromResponse; `utils.json` is its idiom). The
runtime twin `countsMismatch` SHALL live beside the usage schema as ONE
exhaustive switch (`satisfies never` default) shared by the engine and
tests.

#### Scenario: Typo'd counts key fails the typecheck
- **WHEN** a composite doc's estimate returns counts keyed "commnet"
- **THEN** `deno task check` fails at the doc site (proven by ts-expect-error tests)

#### Scenario: Counting fn on a flat doc fails the typecheck
- **WHEN** a PER_CALL doc declares any counting estimate fn
- **THEN** `deno task check` fails — nothing is assignable to the `never` slot

#### Scenario: Mis-shaped state write fails the typecheck
- **WHEN** a doc declares `lifecycle.state: z.object({datasetId: z.string()})` and its poll returns `state: {data: {datasetID: "x"}}`
- **THEN** `deno task check` fails at the write site (not just the runtime tick gate)

### Requirement: Estimates are DEDUCED, never defaulted (D24/D25)
Every estimate SHALL be pure arithmetic over the VALIDATED input — no
fallback constants, no presence-branches over billing knobs. A fixed
quantity that follows from the vendor's price structure (akta: 1.5
credits per 50 records) is deduced, not a fallback — the evidence rides
in a comment. Input-fidelity rules (design D25):
- `schema/inputs.ts` is the FAITHFUL VENDOR MIRROR: optionality only —
  never `.default()` (even vendor-documented ones), never our floors;
  identifier keys unquoted.
- ALL our tightening lives AT THE BINDING, DERIVED from the base schema,
  never restated: `zBody.required({limit: true})` /
  `.extend({f: shape.f.unwrap().default(n)})` / `.unwrap().min(1)` floors
  ONLY where the vendor documents 0/absent = unbounded.
- The PRIMARY limiting knob is REQUIRED at the binding (the caller states
  the cap — even when the actor publishes a default); secondary/behavior
  knobs the estimate reads carry binding `.default(verified actor
  default)` (`default` in the published input schema — `prefill` is
  editor text and justifies nothing).
- Multiplier ARRAYS are never tightened: actor-required stays plain,
  actor-optional stays optional and the estimate reads
  `arr?.length ?? 0` — honest optionality handling, NOT a fallback.
  Empty/absent input ⇒ estimate 0 (deduced ≠ non-zero).
- Never invent structure the mirror doesn't have — estimate at the
  granularity the mirror states.
The engine SHALL materialize schema defaults for body AND
queryParams/pathParams (cloned, `useDefaults`) so estimates read the
same effective knobs the vendor applies.

#### Scenario: Missing limiting knob rejects, never falls back
- **WHEN** a caller omits a required-at-binding limit (tweet-scraper without maxItems)
- **THEN** validation rejects the input — no run, no guessed hold

#### Scenario: Empty multiplier promises zero
- **WHEN** amazon-product-details is called with `Params: []`
- **THEN** the estimate is `{"RESULT": 0}` plus the flat vector — a 0 hold, not an error

#### Scenario: Binding default rides the wire
- **WHEN** youtube-video-transcript is called without `max_videos` (binding default 10, actor-verified)
- **THEN** the validated body carries max_videos=10 and the estimate reads it

### Requirement: No estimate presets — the typed inline fn IS the typed preset (D23)
`presets.estimate.*` SHALL NOT exist: preset field args were unchecked
strings and the portable ctx erased the body typing, and generic presets
cannot recover the field check (the factory call is eager — the doc's
types aren't in scope when the field arg binds). Every estimate SHALL be
a typed inline fn on its doc. Presets survive ONLY at provider-seam
slots where no doc-local typing is lost: `presets.auth.*` (credential
injection) and `presets.usage.perCall` (the canonical flat settle,
`{counts: {}}` by construction). Estimate fns SHALL NOT probe
`data.input.body` via `utils.json` — direct typed access only.

#### Scenario: Fleet grep is clean
- **WHEN** endpoint estimate fns are grepped for utils.json body probing
- **THEN** there are no hits — utils.json appears only where raw vendor output or own RunState is the subject

### Requirement: Ctx facts live at provenance-named paths (D23 addendum)
Hook ctx data SHALL group derived facts under the def section they come
from: the doc's model at `data.usage.model` (estimate + envelope ctxs),
the threaded run state at `data.lifecycle.state` (tick ctxs: the FULL
RunState, required; envelope ctxs: optional — present only for async
runs that produced state). The old flat paths (`data.model`,
`data.state`) SHALL NOT exist.

#### Scenario: Envelope carries the state under lifecycle
- **WHEN** an async run settles with final state
- **THEN** consolidate reads it at `data.lifecycle.state` (absent for declarative runs)
