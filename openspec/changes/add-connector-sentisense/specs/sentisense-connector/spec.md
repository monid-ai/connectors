# sentisense-connector (delta)

## ADDED Requirements

### Requirement: SentiSense provider definition
The SentiSense provider SHALL declare name `sentisense`, `request.baseUrl`
`https://app.sentisense.ai/api`, auth `presets.auth.header("X-SentiSense-API-Key")`,
timeouts 30 s request / 35 s run, one credit pool `default`
("SentiSense credits"), a PER_CALL model consuming 1 from that pool (the
LOOKUP class), and an `output.fromError` that digests `{error, message, suggestions?,
seeInstead?}` into `{message, code?, suggestions?, seeInstead?, raw}`.

#### Scenario: A successful call settles at its class
- **WHEN** any of the 11 endpoints returns 200
- **THEN** usage is `{credits: {default: N}, evidence: {CALL: 1}}` with no
  `mismatch`, where N is the endpoint's class, and the output is the
  response body unchanged

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint receives a 401 `{error: "invalid_api_key", message}`
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the output is `{message, code: "invalid_api_key", raw}`

#### Scenario: An unknown ticker carries its next move
- **WHEN** `sentisense#v1/rating/{ticker}` answers 404 `entity_not_found`
- **THEN** usage is zero and the output carries `code` and the
  `suggestions` array beside the message

### Requirement: Three per-call credit classes
Each endpoint SHALL declare a flat PER_CALL model in its class: LOOKUP 1
(`#v1/kb/entities/search`, `#v2/market-mood`, inherited from the provider),
ANALYTICS 2 (`#v1/stocks/{ticker}/sentiment`, `#v1/rating/{ticker}`,
`#v1/documents/stories/ticker/{ticker}`, `#v1/documents/stories/search`,
`#v1/insider/trades/{ticker}`, `#v1/institutional/holders/{ticker}`) and
ALTERNATIVE DATA 4 (`#v1/insider/cluster-buys`,
`#v1/politicians/filings/{ticker}`, `#v1/stocks/{ticker}/options/summary`).

#### Scenario: The class is the bill
- **WHEN** `#v1/politicians/filings/{ticker}` returns 200
- **THEN** credits are `{default: 4}`; an entity search settles at 1 and a
  sentiment read at 2

### Requirement: Inputs mirror the documented params, strictly
Every query-param mirror SHALL carry the documented params with optionality
only, SHALL enforce the single-field constraints the API answers 400 on, and
SHALL be a strict object, because the API ignores unknown params.

#### Scenario: Out-of-range lookback is refused before the wire
- **WHEN** `#v1/insider/trades/{ticker}`, `#v1/insider/cluster-buys` or
  `#v1/politicians/filings/{ticker}` runs with `lookbackDays` 0 or 366
- **THEN** the run fails with `INVALID_INPUT`; 365 is accepted

#### Scenario: A misspelled param is refused
- **WHEN** `#v1/insider/trades/{ticker}` runs with `lookback: 30`
- **THEN** the run fails with `INVALID_INPUT` and no request is sent

#### Scenario: Enums, dates and required text
- **WHEN** entity search runs with `q: "n"` or an unknown `type`, holders
  with an unknown `sortBy`, or story search with an empty `query`
- **THEN** the run fails with `INVALID_INPUT`

### Requirement: Shared fns intern
The auth inject and the error digest SHALL intern to one fnTable entry each
across the 11 docs.

#### Scenario: One entry per shared fn
- **WHEN** the bundle is compiled
- **THEN** every `sentisense#` doc references the same `auth.inject` and
  `output.fromError` keys
