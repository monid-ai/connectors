# connector-testing (delta)

## ADDED Requirements

### Requirement: Endpoint test runner over compiled artifacts
`runEndpoint({unit, input, mode, …})` SHALL load the COMPILED sealed unit through
`Engine.load` (never the Def) and execute `start` with a `directTransport` whose
`fetch` and param resolver depend on the mode.

#### Scenario: Artifact is what's proven
- **WHEN** an endpoint test runs in any mode
- **THEN** execution goes through `Engine.load` on compiler output

### Requirement: Fixture format and modes
Fixtures SHALL be `{name, calls: [{req: {method, url, body?}, res: {status, body}}]}`
with headers never recorded. Modes: `replay` (default; serves recorded calls in
order, zero network, test params); `record` (live call captured to
`fixtures/<scenario>.json`); `live` (real fetch with env credentials, auto-skipped
when the provider key is unset).

#### Scenario: Replay mismatch
- **WHEN** the engine issues a request whose method/URL differs from the next
  recorded call
- **THEN** replay fails the test with a descriptive mismatch error

#### Scenario: Live gating
- **WHEN** `EXA_API_KEY` is unset
- **THEN** exa live tests are ignored, not failed

### Requirement: Per-endpoint minimum coverage
Every endpoint SHALL ship at least a `happy` fixture (asserting exact output and
exact usage measures) and a `provider-error` fixture (asserting
`isProviderError: true` and zero usage), plus one gated live test.

#### Scenario: Happy path assertions
- **WHEN** the exa search happy fixture replays
- **THEN** the test asserts result-count units, usd cost, and that `costDollars` is
  absent from the output

### Requirement: Compat golden suite
Released bundles SHALL be checked into `shared/testing/goldens/`; CI SHALL replay all
goldens against the HEAD engine. A failure blocks the change as a
backward-compatibility break.

#### Scenario: Old bundle on new engine
- **WHEN** a golden bundle from a prior engine minor is loaded and replayed on HEAD
- **THEN** all runs produce their recorded results
