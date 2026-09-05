# connector-engine (delta)

## MODIFIED Requirements

### Requirement: Temporal-activity-shaped execution surface
`RunnableEndpoint` SHALL be `start(runInput) → RunStartResult`,
`poll(runInput, state) → RunPollResult`, `stop(runInput, state) →
Promise<void>`, `run(runInput) → RunCompleted` — start/poll/stop stateless,
strict-JSON in/out, no sleeps. Input SHALL be re-derived deterministically
(validate + input.toRequest) on every call so lifecycle fns see the same
input each tick. `poll` on a doc without a resolved lifecycle.poll SHALL
reject NOT_ASYNC.

#### Scenario: Poll on a sync endpoint
- **WHEN** poll is called on a doc without lifecycle
- **THEN** the engine rejects with NOT_ASYNC

## ADDED Requirements

### Requirement: Lifecycle execution replaces the declarative pipeline
When a doc carries `lifecycle`, `start` SHALL invoke the linked
`lifecycle.start` fn with `{input, request}` (the compiled request with
{pathParam}s substituted) instead of executing the request itself. A
`running` outcome SHALL return `{kind: "running", state, pollAfterMs:
outcome override ?? timeouts.pollMs, providerRunId?}`; a `completed`
outcome SHALL feed the ONE settle pipeline (consolidate on the raw
envelope + final state → fromResponse → output.schema). A running outcome
without a resolved lifecycle.poll SHALL fail closed (CONTRACT_VIOLATION).

#### Scenario: Full async loop
- **WHEN** run() drives start → running → poll (running) → poll (completed with a second fetch)
- **THEN** the wire sequence is exactly the fn-issued calls and the result settles with the final state in the envelope

### Requirement: utils.http + utils.request are the provider runtime
The engine SHALL bind both PER INVOCATION (this tick's derived input +
substituted request). `http`: raw explicit calls (`path` resolves against
the request URL's origin; only given fields sent). `request(overrides?)`:
the default relay — method/url/headers from the compiled request,
`body ?? input.body`, `queryParams ?? input.queryParams`, per-call
overridable; `utils.request()` alone sends exactly what the declarative
pipeline would. Auth is ALWAYS injected by the transport on both — fns
never see credentials. Responses are sniff-decoded `{status, body}`;
vendor non-2xx is RETURNED; transport failures throw EXECUTION_FAILED
(retriable); malformed call/override shapes throw FN_CONTRACT. ctx.logger
routes to EngineCtx.logger (silent no-op default).

#### Scenario: Auth injected on fn-issued calls
- **WHEN** a lifecycle fn issues utils.http({method, path}) with extra headers
- **THEN** the egressed request carries the injected credential AND the fn's headers

### Requirement: Zero usage forced on every non-2xx envelope
The settle pipeline SHALL force zero usage whenever the envelope's
httpStatus is non-2xx — including fn-SYNTHESIZED statuses for in-body
vendor failures — so a lifecycle fn can never bill an error.

#### Scenario: Actor failure zero-billed
- **WHEN** a poll fn returns {kind: "completed", httpStatus: 500, output}
- **THEN** the run completes isProviderError=true with zero usage

### Requirement: Lifecycle fn enforcement and error taxonomy
The engine SHALL validate lifecycle ctx.data before each call and the
awaited outcome after (FN_CONTRACT on either); EngineErrors thrown inside
fns SHALL propagate untouched; any other uncaught throw SHALL become
EXECUTION_FAILED (retriable). Serialized `state` larger than
`schema.state_max_bytes` SHALL fail closed (FN_CONTRACT).

#### Scenario: Oversized state
- **WHEN** a fn returns running with a 70 KiB state
- **THEN** the engine rejects FN_CONTRACT naming the state cap

#### Scenario: Reserved state key enforced
- **WHEN** a fn returns state with a non-string externalRunId
- **THEN** the engine rejects FN_CONTRACT naming the reserved key

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
pollAfterMs, and on runMs expiry fire best-effort stop then throw TIMEOUT.

#### Scenario: Timeout aborts the vendor job
- **WHEN** run() exceeds timeouts.runMs while polling
- **THEN** the vendor abort is attempted and TIMEOUT is thrown
