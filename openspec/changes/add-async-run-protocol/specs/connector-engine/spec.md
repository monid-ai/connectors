# connector-engine (delta)

## MODIFIED Requirements

### Requirement: Temporal-activity-shaped execution surface
`RunnableEndpoint` SHALL be `estimate(runInput) → Usage`,
`start(runInput) → RunStartResult`, `poll(runInput, state: RunState) →
RunPollResult`, `stop(runInput, state: RunState) → Promise<void>`,
`run(runInput) → RunCompleted` — start/poll/stop stateless, strict-JSON
in/out, no sleeps (each hosted tick builds a THROWAWAY engine; the
workflow is the persistence, state the only cross-tick carrier). Input
SHALL be re-derived deterministically (validate + input.toRequest) on
every call so lifecycle fns see the same input each tick. `poll` on a doc
without a resolved lifecycle.poll SHALL reject NOT_ASYNC.

#### Scenario: Poll on a sync endpoint
- **WHEN** poll is called on a doc without lifecycle
- **THEN** the engine rejects with NOT_ASYNC

## ADDED Requirements

### Requirement: Lifecycle execution replaces the declarative pipeline
When a doc carries `lifecycle`, `start` SHALL invoke the linked
`lifecycle.start` fn with `{input, request}` (the compiled request with
{pathParam}s substituted) instead of executing the request itself. An
outcome's `state` SHALL follow WHOLE-STATE semantics (design D21): a
PRESENT state IS the complete next fn-state (replaces the previous one
wholesale); an ABSENT state carries the previous fn-owned fields forward
untouched — no field-level merge exists. A RUNNING outcome SHALL stamp
engine timing and return `{kind: RUNNING, state: RunState, pollAfterMs:
outcome override ?? timeouts.pollMs}`; a COMPLETED outcome SHALL feed
the ONE settle pipeline (evidence + consolidate on the raw envelope
with the final state → fromResponse → output.schema). A running
outcome without a resolved lifecycle.poll SHALL fail closed
(CONTRACT_VIOLATION).

#### Scenario: Full async loop
- **WHEN** run() drives start → RUNNING → poll (RUNNING) → poll (COMPLETED with a second fetch)
- **THEN** the wire sequence is exactly the fn-issued calls and the result settles with the final state in the envelope

#### Scenario: Present state replaces wholesale
- **WHEN** a poll returns a state without the earlier data bag
- **THEN** the threaded state carries no data — replaced, never field-merged

#### Scenario: Absent state keeps everything
- **WHEN** a poll returns RUNNING with no state
- **THEN** the previous fn-owned fields carry forward untouched

### Requirement: Engine-owned timing on state and result
The engine SHALL stamp `state.timing` itself (fn-states carry no
timing field): first tick initializes {startedAt, startRequestMs,
attempts 0, pollMsTotal 0, deadlineAt = startedAt + timeouts.runMs};
every poll tick stamps lastPolledAt, increments attempts, accumulates
pollMsTotal. At settle the engine SHALL derive `RunCompleted.timing`
(incl. providerTotalMs) from the threaded timing + the injected clock —
for lifecycle AND declarative runs (attempts 0). Host-side slices stay
host-measured.

#### Scenario: Poll advances the clock
- **WHEN** a poll tick returns RUNNING under an injected clock
- **THEN** attempts increments, pollMsTotal accumulates the tick duration, and start-tick facts survive untouched

### Requirement: State validation on every boundary
After each start/poll return the engine SHALL validate the threaded state
(zRunState structure; `state.data` against `doc.lifecycle.stateSchema`
when declared; the `schema.state_max_bytes` size cap) — failure is
FN_CONTRACT (the fn wrote it). Before each poll/stop invocation the
engine SHALL re-validate the host-threaded state the same way — failure
is INVALID_INPUT (host-side corruption is the caller's fault).

#### Scenario: Oversized state
- **WHEN** a fn returns RUNNING with a 70 KiB state.data
- **THEN** the engine rejects FN_CONTRACT naming the state cap

#### Scenario: Typed state rejects a malformed bag
- **WHEN** a doc declares stateSchema and a poll is fed state.data violating it
- **THEN** the engine rejects INVALID_INPUT before invoking the fn

#### Scenario: Reserved state key enforced
- **WHEN** a fn returns state with a non-string externalRunId
- **THEN** the outcome contract rejects FN_CONTRACT

### Requirement: utils.http + utils.request are the provider runtime
The engine SHALL bind both PER INVOCATION (this tick's derived input +
substituted request). `http`: ZERO defaults — `path` resolves against the
request URL's origin; `headers` ARE the complete outbound set (no
doc-header merge). `request(overrides?)`: the default relay —
method/url/headers from the compiled request, PRESENCE-based overrides
for body / queryParams AND the target (`url`|`path`) — a PRESENT
`body: null` overrides with null (never falls back to the caller input;
null is valid JSON), an ABSENT field inherits — `request` can do anything
`http` can, they differ only in defaults; `utils.request()` alone sends exactly what the
declarative pipeline would. Responses are sniff-decoded `{status, body}`;
vendor non-2xx is RETURNED; transport failures throw EXECUTION_FAILED
(retriable); malformed call/override shapes throw FN_CONTRACT. ctx.logger
routes to EngineCtx.logger (silent no-op default).

#### Scenario: Auth injected on same-origin fn calls
- **WHEN** a lifecycle fn issues utils.http({method, path}) with extra headers
- **THEN** the egressed request carries the injected credential AND the fn's headers

#### Scenario: Null body override is presence-based
- **WHEN** a lifecycle fn calls utils.request({body: null})
- **THEN** the egressed request carries a null body, not the caller input's body

### Requirement: Same-origin credential rule (D16)
Credentials SHALL be injected ONLY when the call's target origin equals
the doc request's origin; cross-origin calls egress BARE
(`PreparedRequest.auth` absent — transports skip injection and never
resolve the credential). Absolute targets SHALL be https-only
(FN_CONTRACT otherwise).

#### Scenario: Cross-origin call goes out bare
- **WHEN** a lifecycle fn targets an https url on a different origin
- **THEN** the request egresses without the provider's credentials

### Requirement: Pre-run estimate entrypoint
`estimate(runInput)` SHALL validate the input WITHOUT applying
`input.toRequest` (design D25: the estimate is a promise about the
CALLER's request — schema-shaped, defaults materialized; a reshaping
toRequest like akta's array→CSV would make typed input reads lie) and
run the linked `usage.estimate` fn — PURE, no IO, no state; the fn is
compile-required on every doc (model + estimate + evidence must all
RESOLVE, endpoint ?? provider — a provider-level fallback satisfies
the compiled doc, and for unmetered models the compiler's synthesized
empty fn does; consolidate stays OPTIONAL — design D27). Then the
engine ASSEMBLES the public usage (design D26:
`assembleUsage(model, fnCounts)` — evidence =
the fn quantities + the model's flat 1s (`flatLines(model)`, renamed
from flatCounts; a structural no-op for FREE and pure PER_UNIT models),
credits = the fold through the doc's own rate card). The doc's own
`usage.model` SHALL ride into the estimate ctx (`data.usage.model` —
provenance-named, design D23), and the FN-returned quantities are
validated (`countsMismatch` — the ONE gate; freeMismatch is DELETED
with the cost field, design D26) BEFORE assembly. A standalone command
(`deno task engine:estimate`) SHALL print just the answer — the folded
`{credits, evidence}` (model and pools live on the doc) — loading
against a transport that rejects every call.

#### Scenario: Estimate does no IO
- **WHEN** estimate() runs against a transport that rejects every call
- **THEN** it returns the estimated Usage without touching the wire

#### Scenario: Estimate reads the caller-shaped input
- **WHEN** an akta estimate reads queryParams the provider toRequest would CSV-join
- **THEN** it sees the schema-shaped arrays/scalars (pre-toRequest), typed

#### Scenario: FREE doc estimates empty
- **WHEN** estimate() runs on a FREE-model doc
- **THEN** it returns `{credits: {}, evidence: {}}` — the doc's model is the free fact

### Requirement: The card invariant — estimate and settle share evidence KEYS
For a doc with a metered `usage.model`, estimate() AND the settled usage
SHALL key their `evidence` by the model's billed line ids (a leaf
PER_UNIT's unit; a COMPOSITE's metered component ids; flat lines
engine-appended on BOTH ends) — one rate-card line prices both ends. A
multi-metered composite MAY promise/settle a SUBSET of its metered keys
(input-selected components — linkedin's mode picks which profile rate
bills; design D19), but never a key outside the model. On a count-true
chain (the estimate's counted input equals the produced output) the
estimated usage SHALL deep-equal the settled usage — credits AND
evidence.

#### Scenario: Count-true chain agrees exactly
- **WHEN** 2 queries produce a 2-item chain and the estimate counts queries
- **THEN** estimate(input) deep-equals run(input).usage — credits and evidence alike

### Requirement: Counts ↔ model discipline (validateUsage) + usage assembly (D24/D26)
The engine SHALL validate the usage.evidence fn's return at settle AND
the estimate fn's return against the doc's model, fail-closed as
FN_CONTRACT: a COMPOSITE doc's counts keys must each name a PER_UNIT
component in `model.components` (flat components are ENGINE-appended,
never fn-written); a leaf PER_UNIT doc's single key must equal the model's
unit; PER_CALL and FREE docs may count nothing (`{counts: {}}` only).
`{counts: {}}` passes everywhere as a FN return. AFTER validation, on
SUCCESS settles and estimates, the engine SHALL assemble the public
usage (`assembleUsage(model, fnCounts)`, design D26): evidence = the fn
quantities + `flatLines(model)` (every flat line at exactly 1, leaf
PER_CALL under `CALL`), credits = `ceil(quantity / every) ×
consumes.amount` per line, summed per credit id — the settle output is
`{credits, evidence}`; error settles stay `zeroUsage()` (`{credits: {},
evidence: {}}`) untouched. The doc's model SHALL ride into the
settle envelope (`data.usage.model` — provenance-named, design
D23; the final async state rides beside it at `data.lifecycle.state`) so
a GENERIC provider evidence fn keys its count with zero per-doc code
(leaf → the unit; composite → the sole metered component id —
single-valued by the compiler's ≥2-metered rule).

#### Scenario: Unknown key fails closed
- **WHEN** a usage.evidence fn returns counts keyed by a name not in the composite's components
- **THEN** the run fails FN_CONTRACT naming the key and the declared components

#### Scenario: Flat keys are engine-owned
- **WHEN** a usage.evidence fn keys a count by a PER_CALL component id
- **THEN** the run fails FN_CONTRACT — the flat 1 is engine-appended, never fn-written

#### Scenario: Success settle assembles credits and evidence
- **WHEN** a composite doc settles 23 metered items on a 2xx envelope
- **THEN** the public usage's evidence carries every flat line at 1 beside the 23, and credits carry the engine's fold through the pinned rates

### Requirement: Vendor-claim settle — reported wins, the fold is the check (D27)
On SUCCESS settles the pipeline SHALL run in order: `usage.evidence`
(quantities) → `assembleUsage` (flat 1s + the derived credits fold) →
`usage.consolidate` (when resolved) on the SAME raw envelope →
`output.fromResponse`. Consolidate semantics: the claim's zero entries
prune (`pruneZeroCredits` — 0 = nothing consumed); every claimed pool
id must be a DECLARED credit system (FN_CONTRACT naming the pool
otherwise — a nonzero claim on a FREE doc trips loudly); a NON-EMPTY
pruned claim WINS (`usage.credits` = the vendor's number), the derived
fold demoted to cross-check — disagreement beyond 1e-9
(`creditsDisagree`) rides out as `usage.mismatch.derived` (OUR fold;
warn-logged, never failing the run); an all-empty claim falls back to
the derived fold. The OUTPUT STRIP applies regardless of the claim:
`consolidate.output` (when present) replaces the payload fed to
fromResponse even when the claim is empty. Error settles run NEITHER
usage fn — zero usage forced, payload untouched by usage hooks.

#### Scenario: Non-empty claim wins and flags disagreement
- **WHEN** a success settle derives `{default: 0.0332}` and the consolidate claims `{default: 0.05}`
- **THEN** usage settles credits `{default: 0.05}` with `mismatch: {derived: {default: 0.0332}}`, a warning is logged, and the run succeeds

#### Scenario: Empty claim falls back to the fold
- **WHEN** a consolidate returns `{credits: {default: 0}, output}` (zero prunes empty)
- **THEN** usage keeps the engine's derived fold, no mismatch key appears, and the stripped output still feeds fromResponse

#### Scenario: Undeclared pool fails closed
- **WHEN** a consolidate claims a pool id absent from doc.usage.credits
- **THEN** the run fails FN_CONTRACT naming the claimed pool and the declared ids

#### Scenario: Error settle runs neither usage fn
- **WHEN** an envelope settles non-2xx on a doc with evidence and consolidate fns
- **THEN** neither fn runs — usage is zeroUsage() and the raw payload rides to fromError untouched

### Requirement: Zero usage forced on every non-2xx envelope
The settle pipeline SHALL force zero usage whenever the envelope's
httpStatus is non-2xx — including fn-SYNTHESIZED statuses for in-body
vendor failures — so a lifecycle fn can never bill an error.

#### Scenario: Actor failure zero-billed
- **WHEN** a poll fn returns {kind: COMPLETED, httpStatus: 500, output}
- **THEN** the run completes isProviderError=true with zero usage

### Requirement: Lifecycle fn enforcement and error taxonomy
The engine SHALL validate lifecycle ctx.data before each call and the
awaited outcome after (FN_CONTRACT on either); EngineErrors thrown inside
fns SHALL propagate untouched; a thrown error carrying `retriable ===
false` (JsonPathError, CompileError — deterministic faults) SHALL become
FN_CONTRACT (retry cannot succeed); any other uncaught throw SHALL become
EXECUTION_FAILED (retriable).

#### Scenario: Escaped JsonPathError is not retried
- **WHEN** a lifecycle fn lets a strict json read on an absent path escape
- **THEN** the engine rejects FN_CONTRACT with retriable false

#### Scenario: Unknown throw stays retriable
- **WHEN** a lifecycle fn throws a plain Error
- **THEN** the engine rejects EXECUTION_FAILED (retriable)

### Requirement: Provider-error digestion (output.fromError)
When the settled envelope is a provider error, the engine SHALL apply the
resolved `output.fromError` projection (if any) AFTER zero-usage forcing —
absent means raw passthrough; `output.schema` never applies to error
projections. `RunCompleted.providerHttpStatus` SHALL carry the outcome's
value only when it differs from httpStatus.

#### Scenario: Digest with raw preserved
- **WHEN** a 401 envelope settles on a doc with fromError
- **THEN** the output is the projection (with the raw body under `raw`) and usage stays zero

### Requirement: Best-effort stop and bounded run loop
`stop` SHALL be a no-op without lifecycle.stop; with one it SHALL run the
fn and swallow EVERY failure. `run()` SHALL sleep via the injectable
`EngineCtx.sleep`, read time via `EngineCtx.now`, honor per-tick
pollAfterMs CAPPED BY THE REMAINING runMs BUDGET (a fn-requested long nap
must not delay timeout handling), and on runMs expiry fire best-effort
stop then throw TIMEOUT (the same budget `state.timing.deadlineAt`
records for hosts).

#### Scenario: Timeout aborts the vendor job
- **WHEN** run() exceeds timeouts.runMs while polling
- **THEN** the vendor abort is attempted and TIMEOUT is thrown

#### Scenario: A long pollAfterMs cannot oversleep the budget
- **WHEN** a poll tick requests pollAfterMs far beyond the remaining runMs
- **THEN** the sleep is capped at the remaining budget and TIMEOUT fires on time
