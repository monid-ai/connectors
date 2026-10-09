# apollo-connector (delta)

## ADDED Requirements

### Requirement: Eight synchronous endpoints on one wire surface
The connector SHALL expose `mixed_people/api_search`,
`mixed_companies/search`, `organizations/job_postings`,
`news_articles/search`, `people/match`, `organizations/enrich`,
`people/show` and `organizations/show`, every one a single request against
`https://api.apollo.io/api/v1` with `x-api-key` auth, and SHALL NOT declare
a lifecycle.

#### Scenario: Placeholder paths are pinned to Apollo's scope names
- **WHEN** the bundle compiles
- **THEN** `GET /people/{id}` is `apollo#people/show`,
  `GET /organizations/{id}` is `apollo#organizations/show`, and
  `GET /organizations/{organization_id}/job_postings` is
  `apollo#organizations/job_postings`; every other id derives from its path

### Requirement: Filters are query parameters, arrays are repeated keys
Search filters SHALL be declared as `queryParams` whose keys are Apollo's
wire names including the `[]` suffix, and SHALL be sent as repeated keys.
No endpoint SHALL declare a body or an `input.toRequest`.

#### Scenario: An array filter reaches Apollo as Apollo spells it
- **WHEN** a caller sends `"person_titles[]": ["cto", "vp"]`
- **THEN** the wire query is `person_titles%5B%5D=cto&person_titles%5B%5D=vp`
  and the POST carries no body

### Requirement: The asynchronous channels are closed
`people/match` SHALL reject `reveal_phone_number`, `webhook_url`,
`poll_only`, `run_waterfall_email` and `run_waterfall_phone` before the
wire, and SHALL accept `reveal_personal_emails`.

#### Scenario: A phone request never reaches Apollo
- **WHEN** a caller sends `reveal_phone_number: true`
- **THEN** the run is rejected INVALID_INPUT

### Requirement: At least one identifier, enforced by the compiled schema
`people/match` SHALL require one of `first_name`, `last_name`, `name`,
`email`, `hashed_email`, `organization_name`, `domain`, `id`,
`linkedin_url`; `organizations/enrich` SHALL require one of `domain`,
`linkedin_url`, `website` (`name` alone is not an identifier). Both SHALL
compile as `anyOf` arms, each `additionalProperties: false`.

#### Scenario: A modifier alone is not an identifier
- **WHEN** `people/match` receives only `reveal_personal_emails: true`, or
  `organizations/enrich` receives only `name`
- **THEN** the run is rejected INVALID_INPUT

### Requirement: The pool is Apollo credits and the fold is the bill
`usage.credits` SHALL declare one pool, `default`, in Apollo credits. No
endpoint SHALL declare `usage.consolidate`.

#### Scenario: A page of companies draws one credit
- **WHEN** `mixed_companies/search` returns a page with two organizations
- **THEN** `usage` is `{credits: {default: 1}, evidence: {PAGE: 1}}` and the
  output is the vendor body unchanged

### Requirement: Nothing is drawn when nothing qualifying is returned
The paged endpoints SHALL count `PAGE: 1` only when the delivered collection
is non-empty; the record endpoints SHALL count `RESULT: 1` only when a record
object is present — for `people/match`, when `match_confidence` is not
`"none"` or an email is returned.

#### Scenario: An empty page is free
- **WHEN** `mixed_companies/search` returns `organizations: []`
- **THEN** `usage` is `{credits: {}, evidence: {PAGE: 0}}`

#### Scenario: A no-match enrichment is free
- **WHEN** `people/match` returns a person with `match_confidence: "none"`
  and no email, or `organizations/enrich` returns `organization: null`
- **THEN** `usage` is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: An email bills regardless of confidence
- **WHEN** `people/match` returns `match_confidence: "none"` with a non-empty
  `email`
- **THEN** `usage` is `{credits: {default: 1}, evidence: {RESULT: 1}}`

### Requirement: People search is free
`mixed_people/api_search` SHALL be a FREE model with compiler-synthesized
estimate and evidence.

#### Scenario: A search page draws nothing
- **WHEN** the search returns two previews
- **THEN** `usage` is `{credits: {}, evidence: {}}`

### Requirement: Vendor errors are data
A non-2xx Apollo response SHALL settle as a provider error with zero usage
and its body relayed verbatim; no `output.fromError` is declared.

#### Scenario: An unscoped key
- **WHEN** Apollo answers 403 `{error, error_code: "API_INACCESSIBLE"}`
- **THEN** `isProviderError` is true and `usage` is
  `{credits: {}, evidence: {}}`
