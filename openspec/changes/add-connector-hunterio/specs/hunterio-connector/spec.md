# hunterio-connector (delta)

## ADDED Requirements

### Requirement: Thirteen endpoints, one key, one pool
The provider SHALL declare `https://api.hunter.io/v2`, the `X-API-KEY`
header, and one pool of Hunter credits; every endpoint SHALL carry v1's
published id.

#### Scenario: Two endpoints on the discover wire path
- **WHEN** the bundle compiles
- **THEN** `hunterio#discover` and `hunterio#discover-ai` both post to
  `https://api.hunter.io/v2/discover`, one FREE and one 8.36 credits per
  call

### Requirement: The verifier waits and refuses correctly
`email-verifier` SHALL treat Hunter's 202 as "still running" (re-GET the
same URL every 10 s, up to 180 s) and its 222 as a terminal provider
error (OURS 502, THEIRS 222) with zero usage.

#### Scenario: A pending verification completes
- **WHEN** the first GET answers 202 and the second 200 `status: valid`
- **THEN** `usage` is `{credits: {default: 0.5}, evidence: {RESULT: 1}}`

#### Scenario: The remote SMTP server fails
- **WHEN** the GET answers 222
- **THEN** `httpStatus` is 502, `providerHttpStatus` 222,
  `isProviderError` true, `usage` `{credits: {}, evidence: {}}`

### Requirement: Each paid line bills its own quantity
`domain-search` SHALL count `data.emails[]` and fold per started block of
ten; `email-finder` SHALL count 1 only when `data.email` is a non-empty
string; `email-verifier` SHALL count 1 only on `valid`, `invalid`, or
`accept_all`; `multi-domain-search/reveal` SHALL count `outcome:
"revealed"` rows and claim `meta.credits_charged`, stripping it from the
output.

#### Scenario: Twelve addresses draw two credits
- **WHEN** `domain-search` with `limit: 25` returns 12 addresses
- **THEN** `usage` is `{credits: {default: 2}, evidence: {RESULT: 12}}`

#### Scenario: A bundled reveal
- **WHEN** the reveal answers 3 `revealed` rows and `credits_charged: 2`
- **WHEN** one row is personal and two are generic on one domain
- **THEN** `usage` is `{credits: {default: 2}, evidence: {RESULT: 2}}`;
  `meta.credits_charged` is absent from the output

#### Scenario: A miss is free
- **WHEN** `email-finder` answers 200 with `data.email: null`
- **THEN** `usage` is `{credits: {}, evidence: {RESULT: 0}}`

### Requirement: The vendor's one-of rules survive compilation
Every "at least one of" rule SHALL compile as an `anyOf` of `required`
arms.

#### Scenario: A person without a company is rejected
- **WHEN** `email-finder` receives `{first_name, last_name}` alone
- **THEN** the run is rejected INVALID_INPUT

### Requirement: Vendor errors are data
A non-2xx Hunter response SHALL settle as a provider error with zero
usage and `{message, error_code, raw}` from its `{errors[]}` envelope; the
enrichment trio's 404 miss is such a response.

#### Scenario: An unknown email
- **WHEN** `people/find` answers 404 `{errors: [{id: "not_found", …}]}`
- **THEN** `isProviderError` is true, `output.error_code` is `not_found`,
  `usage` is `{credits: {}, evidence: {}}`
