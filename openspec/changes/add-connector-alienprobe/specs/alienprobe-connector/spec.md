# alienprobe-connector (delta)

## ADDED Requirements

### Requirement: Alien Probe provider definition
The alienprobe provider SHALL declare name `alienprobe`,
`request.baseUrl` `https://lookups.alienprobe.ai/v1/lookup`, an EMPTY
`auth.credentials` object shape, an identity `auth.inject` that returns
the request unchanged, a single `default` credit pool labelled
"US dollars (USDC on Base)", and a provider-level `output.fromError`
that reads `hint`, then `reason`, then `error`, and names an
`error: "payment_required"` body as an x402 payment challenge.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `alienprobe#company`, `alienprobe#who` and
  `alienprobe#lei` exist

#### Scenario: No credential exists
- **WHEN** the compiled doc is inspected
- **THEN** `auth.credentials.properties` is `{}` and no field is required

### Requirement: Fixed price per successful answer
`company` SHALL consume $0.04, `who` $0.05 and `lei` $0.005 from
`default` per 200 answer, as leaf `PER_CALL`. No `consolidate`.

#### Scenario: Paid answer settles flat
- **WHEN** an `alienprobe#company` run returns 200
- **THEN** usage is `{credits: {default: 0.04}, evidence: {CALL: 1}}`

#### Scenario: Refusals are free
- **WHEN** the seller answers 400, 404, 409 or 503
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}`

#### Scenario: Unpaid 402 is data
- **WHEN** a transport that cannot pay x402 receives the 402 challenge
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}` and a message naming x402

### Requirement: Faithful input mirrors
`company` SHALL require `q` (1-200 chars) and mirror optional `kind`
(`domain|name|cik|ticker|lei`); `who` SHALL require `q` (1-200 chars);
`lei` SHALL require `lei` matching `^[0-9A-Z]{20}$`. Every query schema
SHALL be strict.

#### Scenario: Unknown key rejected
- **WHEN** a caller passes a misspelled key (e.g. `knd`) to
  `alienprobe#company`
- **THEN** the run fails with INVALID_INPUT before any network call
