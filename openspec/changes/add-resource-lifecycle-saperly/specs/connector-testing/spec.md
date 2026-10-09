# connector-testing (delta)

## ADDED Requirements

### Requirement: Fixtures seed the reader and carry headers
Fixture chains SHALL accept a top-level `resources` array (rows for the
fake ResourceReader) and per-call `res.headers` (e.g. a 302 `location`).
Replay remains the existing ordered wire-chain match; `utils.sleep` is
instant in replay.

#### Scenario: Ownership replays offline
- **WHEN** a place-calls fixture seeds `{resource: "saperly/phone-number",
  externalId: "num_1"}` and the input names `num_1`
- **THEN** the derived gate passes and the chain executes; with no seed the
  run replays as the uniform 404

### Requirement: Resource ops are testable as sealed units
The harness SHALL provide `loadResource({unit, mode, fixture?})` returning
the loaded resource, and fixture-driven runs of `verify` / `release` /
`refresh` / `view(kind)` / `reconcileUsage(line, window)` — the latter
replayed for the three window shapes (cadence tick, boundary, post-mortem
tail).

#### Scenario: Cumulative meter replay
- **WHEN** a reconcileUsage fixture provides a canned vendor series and a
  boundary window
- **THEN** the runner asserts the returned `{consumes}` for that window

### Requirement: Webhook fns are pure-fn tests
`correlate`/`dispatch` SHALL be testable with delivery JSON in → decision
out, no transport; `subscribe` replays as a wire chain.

#### Scenario: Live spend gating
- **WHEN** live tests run without `SAPERLY_LIVE_SPEND=1`
- **THEN** money-moving live cases (provision, place-calls) skip even when
  `SAPERLY_API_KEY` is present; when enabled they release what they
  provision in teardown
