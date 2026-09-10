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

### Requirement: usage — {credits, evidence}, engine-assembled (D24/D26/D27)
`zUsage` SHALL be the strict pair `{credits, evidence}` (both
`Record<string, number ≥ 0>`) — exactly two facts, both re-derivable:
`evidence` carries one entry per rate-card LINE (the fn-settled
quantities for metered lines, plus every FLAT line ENGINE-appended at
exactly 1: a composite's PER_CALL components under their own line ids
(`{"actor_start": 1, "comment": 23}`), a leaf PER_CALL model under the
reserved `CALL` key — NOT a Unit); `credits` is the ENGINE's fold of
that evidence through the doc's own rate card —
`ceil(quantity / every) × consumes.amount` per line, summed per credit
id — so anyone holding the doc re-derives credits from evidence,
UNLESS the vendor reports its own meter (below): then the claim IS
`credits` and the fold demotes to cross-check. QUANTITIES come from
the `usage.evidence` hook (design D27 — the pre-D27 "consolidate"
renamed to the thing it produces): RAW envelope → `zFnUsage =
{counts}`, quantities per METERED line only — never flat keys (the
type layer and `countsMismatch` reject them), no cost, no receipt
blobs (vendor receipts live in the RAW run record — the receipt IS the
output). `usage.consolidate` SHALL be the VENDOR-METER hook (design
D27, the word restored to its original job): RAW envelope →
`{credits, output?}` — the vendor's OWN consumed-credits claim per
declared pool plus its removal from the payload, one motion via
`utils.json.pluck(json, path) → {value, rest}` (`output` absent =
payload unchanged). Claim semantics: zero entries prune (0 = nothing
consumed); unreported entries are OMITTED, never `?? 0`; an all-empty
claim falls back to the derived fold; a NON-EMPTY claim WINS; claim
pool ids must be DECLARED credit systems (FN_CONTRACT — a nonzero
claim on a FREE doc trips loudly). `zUsage` SHALL carry optional
`mismatch: {derived}`, present ONLY when a non-empty claim disagrees
with the derived fold beyond 1e-9: `derived` is OUR fold — `credits`
already holds the vendor's number. `zeroUsage()` = `{credits: {},
evidence: {}}` is the ERROR-PATH shape (nothing billed, nothing
evidenced); `defaultFnUsage()` = `{counts: {}}`.

#### Scenario: Zero counts nothing
- **WHEN** a provider error forces zero usage
- **THEN** the settled usage is `{credits: {}, evidence: {}}` — no fake evidence of any kind, no flat 1s

#### Scenario: Composite settles quantities plus the credits fold
- **WHEN** facebook-comments-scraper settles 23 dataset items
- **THEN** the usage is evidence `{"comment": 23, "actor_start": 1}` (metered fn-settled, flat engine-appended) and credits `{"default": 0.0332}` — 23 × 0.0014 + the 0.001 actor start, engine-folded

#### Scenario: Leaf flat bills under CALL
- **WHEN** apify#scraptik/tiktok-api (leaf PER_CALL) succeeds
- **THEN** the usage is evidence `{"CALL": 1}`, credits `{"default": 0.002}` — engine-derived, no authored fn (the compiler synthesizes the empty quantities pair)

#### Scenario: A fn writing a flat key fails closed
- **WHEN** a usage.evidence fn returns counts `{"actor_start": 2}`
- **THEN** FN_CONTRACT (and the typed layer rejects it at `deno task check`)

#### Scenario: Non-empty claim wins, agreement stays silent
- **WHEN** a consolidate claims `{default: 0.0332}` and the derived fold agrees within 1e-9
- **THEN** the settled credits are the vendor's claim and NO `mismatch` key is present

#### Scenario: Disagreement rides out as mismatch.derived
- **WHEN** a consolidate claims `{default: 0.05}` and the fold derives `{default: 0.0332}`
- **THEN** usage settles credits `{default: 0.05}` (the vendor's number) with `mismatch: {derived: {default: 0.0332}}` (OUR number) — said, logged, never failing the run

#### Scenario: Zero claim prunes to the derived fold
- **WHEN** an akta FREE lookup settles with `credits_consumed: 0`
- **THEN** the claim prunes empty, usage falls back to the derived fold — `{credits: {}, evidence: {}}`, no mismatch

### Requirement: usage.model — the billing ALGEBRA; the def IS the rate card (D26)
`zUsageModel` SHALL be the discriminated union of two operators, one kind
per file under `usage/model/` with the runtime kind enum DERIVED from the
union (extractZodDiscriminatorKeys — the v1 zPriceTypes pattern; a
literal-typed authoring const is kept in sync by a load-time staleness
guard):
- LEAF: `FREE` ({kind} only — never bills, design D25: no description/
  label, the kind says everything; never a composite component),
  `PER_CALL` ({kind, consumes, vendor?, label?, description?} — billed
  1 iff success, engine-evidenced under its line id — design D24/D26)
  and `PER_UNIT` ({kind, unit, every?, consumes, vendor?, label?,
  description?} — metered per N of unit; pure, no base-fee side
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
evidence/estimate fns (a gated line counts 0 when off; a select-one
populates only the selected key; exa's base-covers-first-10 is
`max(0, n − 10)`); volume schedules stay counting facts, never model
shapes. Every BILLABLE line (PER_CALL and PER_UNIT, leaf or composite
component) REQUIRES `consumes: {credit, amount}` — the def IS the rate
card (design D26, reversing D18's rate-free rule: the tier is one
provider-wide constant, the per-line prices are vendor-published facts
surveyed live; credit → money stays the ONE services-side fact).
PER_UNIT carries optional `every` (int ≥ 1, `.default(1)` MATERIALIZED
at parse — the define generic constrains on `UsageModelSeed` = z.input,
since seed and output diverge on the default): `amount` buys `every`
units, folded in whole increments. Line ids are OURS — snake_case,
MINTED from the vendor's native names by one transform (revises D19's
verbatim-key rule); drift guards DERIVE the join by re-applying the
transform to live names at check time (design D28 — the interim
`vendor` field is deleted: it carried no information the id doesn't).
`usage.credits` sits BESIDE the model — `Record<creditId, {label?,
description?}>`, resolved provider ?? endpoint (OPPOSITE of hooks: the
pool is a provider-wide fact; single-pool providers use id `default`).
`zUsageSection` carries `model?`, `estimate?`, `evidence?` and
`consolidate?` per level — but the model MUST RESOLVE (endpoint ??
provider, compile error if neither: every doc declares what is
chargeable). `doc.usage` carries the resolved `model` REQUIRED inline
(hash-covered), `credits` REQUIRED (`{}` for FREE — an endpoint-level
declaration on a FREE doc is a compile error, dead config), `estimate`
AND `evidence` as REQUIRED FnRefs (the quantities pair, design D27),
and `consolidate` as an OPTIONAL FnRef — present exactly when the
vendor reports a meter. When NEITHER endpoint nor provider declares
estimate/evidence AND the model has no metered lines (FREE / flat —
`hasMeteredLines`), the compiler SYNTHESIZES the one lawful fn
`() => ({counts: {}})` into the missing slot: a real interned fnTable
entry, ONE shared entry repo-wide, provenance
`core#usage.synthesizedEmpty` — the compiled doc stays comprehensive
with nothing to author. Metered models must still resolve BOTH
quantities fns (HOOK_UNRESOLVED if either is missing — the
deduced-estimate guarantee); a ≥2-metered composite forces DOC-level
evidence AND estimate. `presets.usage.perCall` SHALL NOT exist
(deleted, design D27): a flat doc's settle is a forced move, so there
is nothing to author at all. Compile checks: credits must resolve for
billable models; every `consumes.credit` references a declared id; no
declared id goes undrained.

#### Scenario: Metered doc must resolve both quantities fns
- **WHEN** a PER_UNIT doc resolves neither an endpoint- nor provider-level usage.evidence (or usage.estimate)
- **THEN** compile fails HOOK_UNRESOLVED — the model has metered lines, so nothing can be synthesized

#### Scenario: FREE doc compiles with no fns — synthesis
- **WHEN** a FREE-model doc declares no usage fns at any level
- **THEN** it compiles; its estimate AND evidence refs both point at the ONE shared `core#usage.synthesizedEmpty` entry

#### Scenario: Undeclared consumes.credit fails compile
- **WHEN** a line pins `consumes: {credit: "tokens", amount: 1}` but the resolved usage.credits declares no `tokens` pool
- **THEN** compile fails naming the undeclared credit id

#### Scenario: Undrained credit pool fails compile
- **WHEN** usage.credits declares two pools and every line consumes only `default`
- **THEN** compile fails — the second pool is dead config

#### Scenario: every defaults to 1 at parse
- **WHEN** a PER_UNIT line omits `every`
- **THEN** the compiled model carries `every: 1` explicitly — materialized once, never re-derived downstream

### Requirement: FREE usage — the MODEL is the free fact (D25)
Free-ness SHALL live in the MODEL only — `zUsage` carries NO free field.
A FREE doc needs NO usage fns at all: when neither level declares them
the compiler synthesizes the one lawful `() => ({counts: {}})` (design
D27); a declared estimate/evidence fn may return only `{counts: {}}`
(nothing counted; the countsMismatch FREE arm rejects any key — the ONE
gate now that no cost field exists: freeMismatch is DELETED, design
D26). The engine's flat-line completion and credits fold are structural
no-ops for FREE (`flatLines(FREE) = {}`; the fold yields `{}`), so the
public usage of a free run is `{credits: {}, evidence: {}}` — the
settled shape unchanged; consumers read the DOC's model
(`kind: "FREE"`) to render "free".

#### Scenario: FREE doc settles empty
- **WHEN** tinyfish#fetch (model FREE) succeeds
- **THEN** the usage is `{credits: {}, evidence: {}}` — no CALL line, no credits; the doc's model says free

#### Scenario: FREE doc counting fails closed
- **WHEN** a FREE doc's evidence fn returns any counts key
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
only; zod stays the runtime truth): the doc's own evidence/estimate fns
return counts keyed by the model's LITERAL metered keys (a typo'd key or
a flat-component key fails the typecheck; a flat doc's estimate can
promise only `{}`; a FREE doc's fns can promise only `{counts: {}}`);
`data.input.body` / `data.input.queryParams` are typed by the
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
types aren't in scope when the field arg binds). Every AUTHORED
estimate SHALL be a typed inline fn on its doc (a flat/FREE doc
authors none — compiler-synthesized, design D27). Presets survive
ONLY at the one provider-seam slot where no doc-local typing is lost:
`presets.auth.*` (credential injection); `presets.usage.perCall` is
DELETED with D27 synthesis — the canonical flat settle is a forced
move the compiler fills. Estimate fns SHALL NOT probe
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
