# goaimoat-connector (delta)

## ADDED Requirements

### Requirement: GoAI Moat provider definition, free
The goaimoat provider SHALL declare name `goaimoat`,
`request.baseUrl` `https://mcp.goaimoat.com`, auth
`presets.auth.header("X-API-Key")`, timeouts 30 s request / 60 s run, and
`usage.model.kind` `FREE`. It SHALL declare no `output.fromError`,
provider `input.toRequest`, poll, or stop hook.

#### Scenario: The provider bills nothing
- **WHEN** the bundle is compiled
- **THEN** the goaimoat docs SHALL classify as FREE (0 credits on every
  plan)

### Requirement: One POST audit endpoint
The connector SHALL expose exactly one endpoint `ai-visibility`, mapping
to `POST /api/audit`. The input schema SHALL be `.strict()` with
`brand_name` (required non-empty string), `category` (optional string),
and `score` (optional int 0–30).

#### Scenario: A happy audit returns a diagnosis
- **WHEN** `POST /api/audit` with `{ brand_name: "GoAI Moat" }` returns 200
- **THEN** the run SHALL complete with `isProviderError: false` and the
  body SHALL include `brand_name` and `core_thesis`

#### Scenario: An upstream error is a provider error with zero usage
- **WHEN** upstream answers 500 `{ error: "internal server error" }`
- **THEN** the run SHALL complete as a provider error with usage
  `{credits: {}, evidence: {}}` and `httpStatus` 500

#### Scenario: A missing brand_name is rejected before the wire
- **WHEN** the endpoint is called without `brand_name`, or with `score`
  outside 0–30
- **THEN** the run SHALL fail with INVALID_INPUT and no request SHALL be
  issued
