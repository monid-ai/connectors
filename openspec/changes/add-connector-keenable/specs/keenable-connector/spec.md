# keenable-connector (delta)

## ADDED Requirements

### Requirement: Keenable provider definition
The keenable provider SHALL declare name `keenable`, `request.baseUrl`
`https://api.keenable.ai`, auth `presets.auth.header("X-API-Key")`,
timeouts 30 s / 30 s, one credit pool `default` ("Keenable credits"), a
provider-level `usage.model` of PER_CALL 1 Keenable credit, and NO
`usage.consolidate` (REST responses carry no usage receipt). Search
SHALL override the model with PER_UNIT `RESULT`, 1 credit, counting 0
for `results: []`.

#### Scenario: A search consumes one credit
- **WHEN** `POST /v1/search` returns 200 with two results
- **THEN** usage is `{credits: {default: 1}, evidence: {RESULT: 1}}`
- **AND** the payload still carries `query`, `results`, and the
  vendor-echoed `mode`

#### Scenario: An empty search is free
- **WHEN** `POST /v1/search` returns 200 with `results: []`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: A fetch consumes one credit
- **WHEN** `GET /v1/fetch?url=https://example.com` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`
- **AND** output carries `url`, `title`, and markdown `content`

#### Scenario: A 401 is data, zero usage
- **WHEN** either endpoint is called with a malformed API key
- **THEN** the run completes as HTTP 401, `isProviderError` true,
  usage `{credits: {}, evidence: {}}`, and the vendor envelope
  `{error, message}` rides through

### Requirement: Two authenticated endpoints
The connector SHALL provide `POST /v1/search` (`keenable#v1/search`,
`web-search`) and `GET /v1/fetch` (`keenable#v1/fetch`, `web-scraping`).
Search input SHALL be a loose body: `query` required; `site`,
`acquired_after`/`acquired_before`, `published_after`/`published_before`,
`query_time` (non-empty strings), `mode`, `snippet_max_length`
(180–10000), `max_results` (1–50) optional; unspecified keys SHALL pass
through. Fetch input SHALL be strict query params: `url` required
(URI); `max_chars` (≥1), `live` (boolean), `prompt` (1–2000
characters) optional. The keyless `/public` twins SHALL NOT be exposed.

#### Scenario: Search mode is a request field
- **WHEN** `POST /v1/search` is called with `mode: "realtime"`
- **THEN** the body is accepted and sent

#### Scenario: Fetch url is required
- **WHEN** `GET /v1/fetch` is called without `url`, or with a string
  that is not a URI
- **THEN** the run fails INVALID_INPUT

#### Scenario: Live fetch is exposed
- **WHEN** `GET /v1/fetch` is called with `live: true`
- **THEN** the request carries `live=true` and settles one credit
