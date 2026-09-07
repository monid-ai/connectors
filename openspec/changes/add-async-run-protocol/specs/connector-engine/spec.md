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
{pathParam}s substituted) instead of executing the request itself. A
RUNNING outcome SHALL merge the fn's state PATCH presence-based over the
previous state, stamp engine timing, and return `{kind: RUNNING, state:
RunState, pollAfterMs: outcome override ?? timeouts.pollMs}`; a COMPLETED
outcome SHALL feed the ONE settle pipeline (consolidate on the raw
envelope + merged final state → fromResponse → output.schema). A running
outcome without a resolved lifecycle.poll SHALL fail closed
(CONTRACT_VIOLATION).

#### Scenario: Full async loop
- **WHEN** run() drives start → RUNNING → poll (RUNNING) → poll (COMPLETED with a second fetch)
- **THEN** the wire sequence is exactly the fn-issued calls and the result settles with the merged final state in the envelope

### Requirement: Engine-owned timing on state and result
The engine SHALL stamp `state.timing` itself (fns return patches with no
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
After each start/poll return the engine SHALL validate the merged state
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
method/url/headers from the compiled request, `body ?? input.body`,
`queryParams ?? input.queryParams`, presence-based overrides INCLUDING
the target (`url`|`path`) — `request` can do anything `http` can, they
differ only in defaults; `utils.request()` alone sends exactly what the
declarative pipeline would. Responses are sniff-decoded `{status, body}`;
vendor non-2xx is RETURNED; transport failures throw EXECUTION_FAILED
(retriable); malformed call/override shapes throw FN_CONTRACT. ctx.logger
routes to EngineCtx.logger (silent no-op default).

#### Scenario: Auth injected on same-origin fn calls
- **WHEN** a lifecycle fn issues utils.http({method, path}) with extra headers
- **THEN** the egressed request carries the injected credential AND the fn's headers

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
`estimate(runInput)` SHALL derive the input (validate + toRequest) and
run the linked `usage.estimate` fn — PURE, no IO, no state; absent
estimate ⇒ `{units: []}` (nothing countable to predict — the PER_CALL
posture: the flat charge is fully described by the model + success). A
standalone command (`deno task engine:estimate`) SHALL print the model +
estimated units, loading against a transport that rejects every call.

#### Scenario: Estimate does no IO
- **WHEN** estimate() runs against a transport that rejects every call
- **THEN** it returns the estimated Usage without touching the wire

### Requirement: The card invariant — estimate and settle share units
For a doc with a metered `usage.model`, estimate() AND the settled usage
SHALL each report a measure of every billed unit (PER_UNIT's unit; a
COMPOSITE's PER_UNIT component units) — one card row prices both ends.
On a count-true chain (the estimate's counted input equals the produced
output) the estimated units SHALL deep-equal the settled units.

#### Scenario: Count-true chain agrees exactly
- **WHEN** 2 queries produce a 2-item chain and the estimate counts queries
- **THEN** estimate(input).units deep-equals run(input).usage.units

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
pollAfterMs, and on runMs expiry fire best-effort stop then throw TIMEOUT
(the same budget `state.timing.deadlineAt` records for hosts).

#### Scenario: Timeout aborts the vendor job
- **WHEN** run() exceeds timeouts.runMs while polling
- **THEN** the vendor abort is attempted and TIMEOUT is thrown
