# local-host-loop (delta)

## ADDED Requirements

### Requirement: The local store indexes declared lookup keys

The Deno KV store SHALL write one index row per resolved lookup key,
`["index", <resourceId>, <keyName>, <value>] → { externalId }`, in the
SAME atomic commit as the owned row. `release` and `forget` SHALL delete
a row's index entries in their own commit, and `refresh` SHALL re-derive
them from the new data, deleting superseded entries.

`get`, `owned`, `release`, `refresh` and `forget` SHALL resolve their
handle through the index before acting, so any declared handle addresses
the resource. An unresolvable handle SHALL remain unresolved.

The key NAME rides in the KV key so an index dump states which declared
key matched and a single key can be listed or retired.

#### Scenario: Both handles reach one row

- **WHEN** a number is provisioned with `keys: { e164: … }`
- **THEN** `get` by externalId and `get` by the E.164 SHALL return the
  same canonical row

#### Scenario: A pointer never outlives its row

- **WHEN** an indexed resource is released
- **THEN** neither the externalId nor any indexed key SHALL resolve
- **AND** a release tombstone SHALL remain

#### Scenario: A refresh retires the superseded value

- **WHEN** a refresh changes the field a key reads
- **THEN** the previous value SHALL stop resolving and the new value
  SHALL resolve

#### Scenario: Releasing by a lookup key

- **WHEN** `release` is called with an indexed key rather than the
  externalId
- **THEN** the canonical row SHALL be released

#### Scenario: One key value never names two resources

- **WHEN** a provision would point an already-indexed key value at a
  DIFFERENT externalId
- **THEN** the store SHALL refuse, naming both resources
- **AND** re-provisioning the SAME externalId SHALL be allowed (a
  resurrect reclaims its own keys)

### Requirement: Stored rows can be re-indexed

The store SHALL expose `reindex`, re-deriving `type` and lookup keys for
every stored row from the CURRENT defs and rewriting the index, leaving
`data` untouched.

A def that gains a key otherwise leaves already-persisted rows silently
unindexed, and re-provisioning a live resource to repair that would buy
it twice.

#### Scenario: A row written before the key existed

- **WHEN** a row is persisted with no def knowledge, the def then
  declares a key, and `reindex` runs
- **THEN** the row SHALL carry its type and resolved keys
- **AND** the key value SHALL resolve to it

### Requirement: The host names the owner of a webhook delivery

The local webhook loop SHALL resolve a route verdict's `who` to a
concrete owned row before acting on `what`, including the `alias`
correlation (resolved across the provider's resource docs), and SHALL
log the owner — or state that the alias resolves to no owned resource.

#### Scenario: An inbound call event names its number

- **WHEN** a delivery routes to `{kind: "alias", e164}` and that E.164
  is indexed
- **THEN** the loop SHALL report the owning resource and its externalId

### Requirement: A CLI inspects owned resources

`deno task resources` SHALL list, inspect, and report released
instances from the local store, and SHALL support `reindex` and a
`--force`-gated `forget`.

Filters (`--provider`, `--type`, `--resource`) SHALL compose with AND,
mirroring `catalog`'s filter shape. `inspect` SHALL accept an
`externalId`, an `identifier`, or any indexed lookup key.

`forget` SHALL remove the local row and its index WITHOUT releasing
upstream, SHALL leave no tombstone, and SHALL require `--force`.

#### Scenario: Inspecting by the human handle

- **WHEN** `resources inspect` is given an indexed E.164
- **THEN** the owning row SHALL be printed with its externalId,
  identifier, resolved keys and data

#### Scenario: forget refuses without --force

- **WHEN** `resources forget` runs without `--force`
- **THEN** it SHALL refuse and SHALL state that the vendor keeps billing

### Requirement: Script output is readable by default and machine-readable when piped

Scripts SHALL select their output mode by detection: a terminal receives
a formatted summary or aligned table, a non-terminal receives JSON. `-j` /
`--json` and `--pretty` SHALL force the mode.

`engine:run`'s human summary SHALL state the run's outcome, its settled
usage (naming any declared-vs-settled mismatch), the failure reason when
the run is a provider error, and each provisioned resource's
`externalId` on its own line.

#### Scenario: A pipe keeps working

- **WHEN** a script's stdout is not a terminal and no flag is given
- **THEN** it SHALL emit JSON

#### Scenario: The provisioned id is findable

- **WHEN** a run provisions a resource and the summary is shown
- **THEN** the externalId SHALL appear as its own labelled field
