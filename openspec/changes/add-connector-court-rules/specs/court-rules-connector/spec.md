## ADDED Requirements

### Requirement: court-rules connector

The system SHALL compile a `court-rules` provider whose endpoints are
read-only GETs against `https://api.courtrules.app`, SHALL authenticate
with an `Authorization: Bearer` API key, and SHALL declare a FREE usage
model.

#### Scenario: compiled judge roster url

- **WHEN** the catalog compiles the provider
- **THEN** `court-rules#api/v1/judges` carries the request url
  `https://api.courtrules.app/api/v1/judges`

#### Scenario: compiled holiday calendar url

- **WHEN** the catalog compiles the provider
- **THEN** `court-rules#api/v1/holidays` carries the request url
  `https://api.courtrules.app/api/v1/holidays`

#### Scenario: free settle

- **WHEN** a run completes against either endpoint
- **THEN** usage settles as `{credits: {}, evidence: {}}`, because the
  provider has no vendor meter to consolidate

### Requirement: court-rules input fidelity

#### Scenario: district filter

- **WHEN** a caller passes `district_id`
- **THEN** the engine sends it as a query parameter and the compiled input
  schema still reports it optional

#### Scenario: omitted filter

- **WHEN** a caller omits `district_id`
- **THEN** the run is valid and the vendor applies its documented
  every-court behaviour
