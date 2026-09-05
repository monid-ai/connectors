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

### Requirement: Lifecycle hook family contracts
The schema SHALL define the effectful lifecycle hook family
(`hooks/lifecycle.ts`): `LifecycleStartFn` (`ctx.data = {input, request}`),
`LifecyclePollFn` and `LifecycleStopFn` (`ctx.data = {input, request,
state}`), each async, each receiving `LifecycleUtils` = the pure ABI
(`json`, `money`) plus `http` (zHttpCall: method + exactly one of url|path
+ headers?/queryParams?/body?/requestMs?) and `request` (the default relay:
zRequestOverrides — method/headers/queryParams/body/requestMs, never a
target). The shared outcome union SHALL be `{kind: "running", state,
pollAfterMs?} | {kind: "completed", httpStatus, providerHttpStatus?,
output, state?}`.

#### Scenario: HttpCall shape is validated
- **WHEN** a lifecycle fn calls utils.http with both `url` and `path` (or neither)
- **THEN** the call is rejected (exactly one of url | path)

### Requirement: Lifecycle def section, doc field, and fn-key closure
`zEndpointDef` and `zProviderDef` SHALL carry an optional
`lifecycle: {start?, poll?, stop?}` section of fn carriers (all leaves
`.optional()` per the D20 no-`.default()` rule). `zEndpointDoc` SHALL carry
an optional `lifecycle: {start: FnRef, poll?: FnRef, stop?: FnRef}`;
`fnKeysOf` SHALL include every lifecycle ref, so sealed units and the
bundle fnTable closure cover the family.

#### Scenario: Sealed unit closes over lifecycle fns
- **WHEN** a doc with lifecycle {start, poll, stop} is sealed
- **THEN** the unit's fns contain entries for all three refs

### Requirement: Activated run-running result
`zRunRunning` SHALL be `{kind: "running", state: Json, pollAfterMs:
positive int, providerRunId?: string}` — ONE shape for both start and poll
(providerRunId kept on poll ticks); `zRunStartResult`/`zRunPollResult` are
aliases of `zRunResult`.

#### Scenario: Running result round-trips
- **WHEN** `{kind: "running", state: {runId: "r"}, pollAfterMs: 2000, providerRunId: "r"}` is parsed
- **THEN** zRunResult accepts it

### Requirement: Envelope carries the final lifecycle state
`zEnvelopeData` SHALL gain optional `state: Json` so `usage.consolidate`
and `output.fromResponse` on lifecycle docs can read billing signals
stashed during polling. Sync docs are unaffected (field absent).

#### Scenario: Consolidate reads poll-stashed signals
- **WHEN** a lifecycle run completes with state `{usageTotalUsd: 0.01}`
- **THEN** the consolidate fn's `data.state` carries that value

### Requirement: Timeouts gain the poll cadence
`zTimeouts` (doc) and `zTimeoutsSection` (def) SHALL gain optional
`pollMs`; contract config SHALL expose `schema.async_since`,
`schema.state_max_bytes`, and `compiler.defaults.poll_interval_ms`.

#### Scenario: Sync docs never carry pollMs
- **WHEN** a doc without lifecycle.poll is compiled
- **THEN** its timeouts lack `pollMs`
