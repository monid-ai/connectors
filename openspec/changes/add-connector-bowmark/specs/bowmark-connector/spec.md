# bowmark-connector (delta)

## ADDED Requirements

### Requirement: Bowmark provider definition
The bowmark provider SHALL declare name `bowmark`, `request.baseUrl`
`https://api.bowmark.ai/v1/monid`, auth `presets.auth.bearer()`, one credit
pool `default` ("US dollars"), and NO `usage.consolidate` (the run envelope
carries no price).

#### Scenario: A finished run bills the pinned rate
- **WHEN** `POST /run` returns 200 with `status: "ok"` or `"partial"`
- **THEN** usage is `{credits: {default: 0.04}, evidence: {RESULT: 1}}`
- **AND** the run envelope rides through unchanged

#### Scenario: A failed run is free
- **WHEN** `POST /run` returns 200 with `status: "error"` or `"needs_user"`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: A library read is free
- **WHEN** `GET /library?query=flights` returns 200
- **THEN** usage is `{credits: {}, evidence: {}}`
- **AND** output carries `library` (Markdown), `query` and `queries`

#### Scenario: A 401 is data, zero usage
- **WHEN** `/run` is called with an invalid API key
- **THEN** the run completes as HTTP 401, `isProviderError` true, usage
  `{credits: {}, evidence: {}}`, and Bowmark's envelope rides through

### Requirement: Two endpoints
The connector SHALL provide `GET /library` (`bowmark#library`,
`web-automation`, `Accept: application/json`) and `POST /run`
(`bowmark#run`, `web-automation`). Library input SHALL be strict query
params with an optional non-empty `query`. Run input SHALL be a strict body
with a required non-empty `script`.

#### Scenario: Script is required
- **WHEN** `POST /run` is called with no `script` or an empty one
- **THEN** the run fails INVALID_INPUT
