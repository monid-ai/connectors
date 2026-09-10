# connector-compiler (delta)

## ADDED Requirements

### Requirement: Leaf-wise lifecycle resolution and interning
The compiler SHALL resolve each lifecycle phase leaf-wise (endpoint ??
provider), intern resolved fns with `api = schema.async_since`, and emit
`doc.lifecycle` iff `start` resolves. `poll`/`stop` resolving without
`start` SHALL be a compile error (HOOK_UNRESOLVED). The existing
minEngineVersion computation (semverMax over referenced fn `api`s)
SHALL floor every doc at `schema.fn_abi_since` (0.0.1 — the
structured-state/estimate ABI) with no new mechanism.

#### Scenario: Provider lifecycle shared by data-only endpoints
- **WHEN** a provider declares start/poll/stop and five endpoints declare none
- **THEN** all five docs reference the SAME three fnTable entries and floor at 0.0.1

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
(never interned) and is REQUIRED — endpoint ?? provider, compile error
(HOOK_UNRESOLVED) if neither declares one: every doc states what is
chargeable. `usage.estimate` SHALL resolve leaf-wise, intern with
`api = schema.fn_abi_since`, land at `doc.usage.estimate`, and join
fnKeysOf/minEngineVersion inputs.

#### Scenario: Model must resolve
- **WHEN** neither endpoint nor provider declares usage.model
- **THEN** compilation fails with code HOOK_UNRESOLVED naming usage.model

#### Scenario: Endpoint model overrides the provider default
- **WHEN** a provider declares model per_result and an endpoint declares per_call
- **THEN** that endpoint's doc carries per_call

### Requirement: ≥2 metered components require DOC-level fns
A COMPOSITE model with two or more PER_UNIT components SHALL fail
compilation (HOOK_UNRESOLVED) unless the ENDPOINT itself declares
`usage.consolidate` AND `usage.estimate` — a generic provider fn keys its
count by "the sole metered component" and has no basis to choose between
two (design D19). Rejected at build time, never at the first live run.

#### Scenario: Multi-metered composite without doc fns
- **WHEN** an endpoint declares two PER_UNIT components and inherits the provider consolidate
- **THEN** compilation fails naming the metered-component count and the missing doc-level fn

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

### Requirement: Identity derivation + uniqueness (D22)
The compiler SHALL derive each doc's identity from the def
(`endpoint ?? request.path` with trailing slashes stripped, validated as
a native path), stamp it on the doc (`endpoint`), mint
`id = provider# + endpoint.slice(1)`, and REJECT duplicate identities per
provider (DOC_MALFORMED). Folder names are validated for shape only and
never enter the id.

#### Scenario: Duplicate identity rejected
- **WHEN** two endpoint defs resolve to the same endpoint path
- **THEN** compilation fails DOC_MALFORMED naming the colliding id
