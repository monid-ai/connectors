# connector-testing (delta)

## ADDED Requirements

### Requirement: Async fixtures replay instantly through the same format
Multi-call fixtures (`calls: [start, poll…, result]`) SHALL replay in order
through the unchanged fixture format — fn-issued utils.http calls included
(they traverse the same transport). Replay mode SHALL inject an instant
sleeper (`EngineCtx.sleep`) so pollAfterMs never delays tests; `record`
SHALL capture whole live chains at real cadence.

#### Scenario: Recorded async chain replays with zero network
- **WHEN** a recorded 5-call start→poll×3→dataset fixture is replayed via runEndpoint
- **THEN** run() completes instantly with the recorded settle result
