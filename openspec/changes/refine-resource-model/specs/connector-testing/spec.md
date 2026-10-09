# connector-testing (delta)

## MODIFIED Requirements

### Requirement: Harness follows the refined vocabulary
`fixtureReader` and test seeds SHALL use `OwnedResource`; resource-op
tests drive `verify/release/refresh/reconcileUsage/view` on the loaded
resource; endpoint tests exercise the estimate's `elapsedMs` re-run via
`accrued()`; webhook pure-fn tests call `route` and assert `{who, what}`.

#### Scenario: Route test
- **WHEN** a signed delivery fixture routes
- **THEN** one assertion covers correlation AND action
