# connector-testing (delta)

## ADDED Requirements

### Requirement: Minimal shared fixture chains (fixture strategy v2)
Fixtures SHALL be committed DATA files at PROVIDER level
(`connectors/<provider>/fixtures/<shape>.json`) — one hand-minimized
chain per lifecycle SHAPE, each with a required `description` stating
what it exercises. Recorded call urls MAY carry `{{request.url}}` /
`{{request.origin}}` placeholders; `replayFetch(fixture, bindings)` binds
them from the endpoint under test's compiled request, so ONE chain serves
every endpoint of the provider. Replay mode SHALL inject an instant
sleeper (`EngineCtx.sleep`) so pollAfterMs never delays tests.

#### Scenario: One chain, every endpoint
- **WHEN** the run-succeeded chain replays against each of a provider's endpoints
- **THEN** the start call matches each endpoint's own compiled request url via the binding

### Requirement: PII scrub on record
The recorder SHALL apply `scrubJson` (email/phone-shaped string leaves →
structural placeholders; keys/shape intact) to every recorded response
body, ALWAYS — even with `--no-trim`. Recordings are raw material;
committed shared chains are additionally hand-minimized.

#### Scenario: Recorded PII never lands
- **WHEN** a live response containing an email address is recorded
- **THEN** the written fixture carries user@example.com in its place

### Requirement: Fixture size lint
The fixture-size lint SHALL bound committed fixture files (warn 32 KiB,
fail 128 KiB) — shared minimal chains sit far under it.

#### Scenario: Bloated fixture rejected
- **WHEN** a fixture file exceeds 128 KiB
- **THEN** the lint test fails naming the file
