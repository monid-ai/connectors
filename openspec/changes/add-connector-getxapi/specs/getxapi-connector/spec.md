# getxapi-connector (delta)

## ADDED Requirements

### Requirement: GetXAPI provider definition

The getxapi provider SHALL declare name `getxapi`, `request.baseUrl`
`https://api.getxapi.com/twitter`, auth `presets.auth.bearer()`, timeouts
30 s request / 30 s run, credit pool `default` ("US dollars"), and a
provider-level `output.fromError`. It SHALL NOT declare a lifecycle, an
`input.toRequest`, an `output.fromResponse` or a `usage.consolidate`.

#### Scenario: Vendor non-2xx is zero-billed data

- **WHEN** any endpoint receives a 404 `{ error: "Tweet not found: 1" }`
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the output is `{ message: "Tweet not found: 1", raw: { error: ... } }`

#### Scenario: A bad key is data

- **WHEN** a call is made with an invalid key and the vendor answers 401
  `{ error: "Invalid API key" }`
- **THEN** the run completes as a provider error with zero usage

### Requirement: Flat dollar price per call

Every endpoint SHALL declare a `PER_CALL` model drawing its published
dollar price from the `default` pool: 0.005 for `tweet/thread`, 0.003 for
`user/tweets/complete`, and 0.001 for every other endpoint.

#### Scenario: A successful call settles its flat price

- **WHEN** `getxapi#tweet/advanced_search` returns a 200 page
- **THEN** usage is `{credits: {default: 0.001}, evidence: {CALL: 1}}` and
  the output equals the vendor body

#### Scenario: A billed empty answer

- **WHEN** `getxapi#user/status` is asked about an account that does not
  exist and answers 200 with `status: not_found`
- **THEN** usage is `{credits: {default: 0.001}, evidence: {CALL: 1}}`

### Requirement: Identities are the vendor's own paths

Every endpoint's identity SHALL be its path under the `/twitter` prefix,
so the endpoint an agent names is the endpoint GetXAPI documents.

#### Scenario: The compiled ids

- **WHEN** the compiled bundle is inspected
- **THEN** it carries exactly the 25 ids listed in the proposal, each with
  `request.url` equal to `https://api.getxapi.com/twitter/<path>`

### Requirement: Strict input mirrors

Every endpoint's `queryParams` SHALL be a strict object (or, for
`user/tweets`, a union of two strict objects) mirroring the vendor's
OpenAPI operation.

#### Scenario: Unknown keys never reach the wire

- **WHEN** any endpoint is given a query parameter the vendor does not
  document
- **THEN** the run is rejected with INVALID_INPUT before any request

#### Scenario: Exactly one account identifier on user/tweets

- **WHEN** `getxapi#user/tweets` is given both `userName` and `userId`, or
  neither
- **THEN** the run is rejected with INVALID_INPUT
