# connector-compiler (delta)

## ADDED Requirements

### Requirement: Leaf-wise lifecycle resolution and interning
The compiler SHALL resolve each lifecycle phase leaf-wise (endpoint ??
provider), intern resolved fns with `api = schema.async_since`, and emit
`doc.lifecycle` iff `start` resolves. `poll`/`stop` resolving without
`start` SHALL be a compile error (HOOK_UNRESOLVED). The existing
minEngineVersion computation (semverMax over referenced fn `api`s)
SHALL floor every doc at `schema.fn_abi_since` (0.3.0 — the
structured-state/estimate ABI) with no new mechanism.

#### Scenario: Provider lifecycle shared by data-only endpoints
- **WHEN** a provider declares start/poll/stop and five endpoints declare none
- **THEN** all five docs reference the SAME three fnTable entries and floor at 0.3.0

### Requirement: Typed state compilation (lifecycle.state → stateSchema)
`lifecycle.state` SHALL resolve leaf-wise (endpoint ?? provider) and
compile to JSON Schema at `doc.lifecycle.stateSchema` (hash-covered). A
declared state schema without a resolved `start` SHALL be a compile error
(STATE_SCHEMA_INVALID — dead config); an unconvertible zod schema SHALL
fail with the same code.

#### Scenario: Provider state schema inherited
- **WHEN** a provider declares lifecycle.state and endpoints declare none
- **THEN** every lifecycle doc carries the compiled stateSchema

### Requirement: usage.model + usage.estimate resolution
`usage.model` SHALL resolve leaf-wise as inline DATA on `doc.usage.model`
(never interned); `usage.estimate` SHALL resolve leaf-wise, intern with
`api = schema.fn_abi_since`, land at `doc.usage.estimate`, and join
fnKeysOf/minEngineVersion inputs.

#### Scenario: Endpoint model overrides the provider default
- **WHEN** a provider declares model per_result and an endpoint declares per_call
- **THEN** that endpoint's doc carries per_call

### Requirement: Coded compile errors (CompileError)
Every compiler rejection SHALL be a `CompileError` with `code`
(SCHEMA_INVALID | HOOK_UNRESOLVED | STATE_SCHEMA_INVALID | DOC_MALFORMED)
and `retriable = false` — build tooling branches on WHY without
string-matching.

#### Scenario: Unresolvable settle fn
- **WHEN** neither endpoint nor provider declares usage.consolidate
- **THEN** compilation fails with code HOOK_UNRESOLVED

### Requirement: pollMs resolution and dead-config lint
`timeouts.pollMs` SHALL resolve endpoint ?? provider ??
`compiler.defaults.poll_interval_ms` and be emitted iff lifecycle.poll
resolves. An ENDPOINT-level pollMs on a doc without a resolved poll SHALL
be a compile error (DOC_MALFORMED); a provider-level pollMs over a mixed
endpoint set is a legitimate default (not emitted for sync docs).

#### Scenario: Dead endpoint pollMs
- **WHEN** a sync endpoint declares timeouts.pollMs
- **THEN** compilation fails naming the dead config

### Requirement: fromError resolution
`output.fromError` SHALL resolve leaf-wise (endpoint ?? provider) and
intern like fromResponse; its ref joins fnKeysOf/minEngineVersion inputs.

#### Scenario: Provider-level fromError shared
- **WHEN** a provider declares output.fromError and endpoints declare none
- **THEN** every doc references the same fromError fn id

### Requirement: Closed-term whitelist additions
The closed-term lint SHALL additionally whitelist `encodeURIComponent`,
`decodeURIComponent`, and `Promise` (pure globals lifecycle fns need).

#### Scenario: Wire-path escaping lints clean
- **WHEN** a lifecycle fn uses encodeURIComponent in a path expression
- **THEN** the closed-term lint passes
