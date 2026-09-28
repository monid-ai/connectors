# philidor-connector (delta)

## ADDED Requirements

### Requirement: Philidor provider definition

The philidor provider SHALL declare name `philidor`, base URL
`https://api.philidor.io/v1`, bearer auth, 20 s request and 30 s run timeouts,
and a FREE usage model. It SHALL normalize non-2xx
`{error: {code, message}}` bodies to `{message, code, raw}` and SHALL preserve
successful response bodies unchanged.

#### Scenario: A successful read is free and faithful

- **WHEN** any Philidor endpoint returns HTTP 200 JSON
- **THEN** the run SHALL return that JSON unchanged with usage
  `{credits: {}, evidence: {}}`

#### Scenario: A provider error is normalized and free

- **WHEN** `GET /markets/not-a-market` returns 404 with Philidor's error envelope
- **THEN** the run SHALL be a provider error with message `Market not found`,
  code `NOT_FOUND`, the original body under `raw`, and zero usage

### Requirement: Nine read-only risk-intelligence tools

The connector SHALL expose exactly these ids: `philidor#vaults`,
`philidor#vault/{network}/{address}`, `philidor#events`,
`philidor#security-events`, `philidor#signals`, `philidor#rwa`,
`philidor#rwa/{asset_id}`, `philidor#markets`, and
`philidor#markets/{id}`. Each id SHALL map to the same path beneath the
provider's `/v1` base URL.

#### Scenario: Path parameters are encoded into the vendor URL

- **WHEN** vault detail runs with network `ethereum` and an EVM address
- **THEN** the request URL SHALL be
  `https://api.philidor.io/v1/vault/ethereum/<address>`

#### Scenario: Discovery tools stay bounded

- **WHEN** a list tool is called with `limit` outside 1–100
- **THEN** it SHALL fail INVALID_INPUT before any request is issued

### Requirement: Inputs mirror the public OpenAPI

Query and path schemas SHALL use Philidor's published parameter names, enums,
numeric bounds, and path identifiers. The connector SHALL declare no
`input.toRequest`: the validated values SHALL be the wire values.

#### Scenario: Risk filters are validated

- **WHEN** events receives `daysBack: 731`, RWA discovery receives an unknown
  category, or RWA detail receives a non-numeric asset id
- **THEN** the run SHALL fail INVALID_INPUT before any request is issued

### Requirement: Fixtures are real and credential-free

Every endpoint SHALL have a recorder-trimmed fixture from a real Philidor API
response. Committed fixtures SHALL contain no authorization header or API key.

#### Scenario: Offline replay covers every endpoint

- **WHEN** the Philidor test suite runs without network or credentials
- **THEN** all nine happy paths and the recorded provider-error path SHALL replay
  successfully
