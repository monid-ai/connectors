# saperly-connector (delta)

## MODIFIED Requirements

### Requirement: Saperly follows the refined resource model
The saperly connector SHALL be rewritten to the refined shapes:
`phone-number` resource with `slug: "phone-number"`, `usage: { period
MONTH/1/CREATION_TIME, lines: { rent: { consumes $2 } } }` (no leads —
host config), `lifecycle: { verify, release, refresh }`,
`views: { connection: { label: "Connection", read } }`; endpoints declare
purpose-keyed `resources:` bindings and read gated instances from
`data.resources[alias]`; place-calls/inbound-calls use the merged
estimate (`elapsedMs` floor 60 s, `updateEstimateEveryMs: 30_000`, no
buffer); the provider webhook flattens to
`webhooks: { "number-events": { verify, route } }` with ONE route fn.

#### Scenario: Place-calls live estimate
- **WHEN** `accrued(input, 150_000)` runs
- **THEN** the fold prices 150 s at the SECOND/60 card

#### Scenario: Gated instance in start
- **WHEN** get-numbers runs for an owned id
- **THEN** its start fn reads `data.resources.numberId` (no owned() call)
