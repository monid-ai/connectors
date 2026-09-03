# connector-compiler (delta)

## ADDED Requirements

### Requirement: Leaf-wise lifecycle resolution and interning
The compiler SHALL resolve each lifecycle phase leaf-wise (endpoint ??
provider), intern resolved fns with `api = schema.async_since`, and emit
`doc.lifecycle` iff `start` resolves. `poll`/`stop` resolving without
`start` SHALL be a compile error. The existing minEngineVersion
computation (semverMax over referenced fn `api`s) SHALL floor lifecycle
docs at async_since with no new mechanism; sync docs SHALL stay at
doc_format_since.

#### Scenario: Provider lifecycle shared by data-only endpoints
- **WHEN** a provider declares start/poll/stop and five endpoints declare none
- **THEN** all five docs reference the SAME three fnTable entries and floor at 0.2.0

#### Scenario: Sync docs never over-pinned
- **WHEN** a connector without lifecycle is recompiled after this change
- **THEN** its docs are byte-identical, minEngineVersion 0.1.0

### Requirement: pollMs resolution and dead-config lint
`timeouts.pollMs` SHALL resolve endpoint ?? provider ??
`compiler.defaults.poll_interval_ms` and be emitted iff lifecycle.poll
resolves. An ENDPOINT-level pollMs on a doc without a resolved poll SHALL
be a compile error; a provider-level pollMs over a mixed endpoint set is a
legitimate default (not emitted for sync docs).

#### Scenario: Dead endpoint pollMs
- **WHEN** a sync endpoint declares timeouts.pollMs
- **THEN** compilation fails naming the dead config

### Requirement: Closed-term whitelist additions
The closed-term lint SHALL additionally whitelist `encodeURIComponent`,
`decodeURIComponent`, and `Promise` (pure globals lifecycle fns need).

#### Scenario: Wire-path escaping lints clean
- **WHEN** a lifecycle fn uses encodeURIComponent in a path expression
- **THEN** the closed-term lint passes
