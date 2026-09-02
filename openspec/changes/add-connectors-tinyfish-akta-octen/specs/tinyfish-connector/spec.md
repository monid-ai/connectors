# tinyfish-connector (delta)

## ADDED Requirements

### Requirement: TinyFish provider definition
The tinyfish provider SHALL declare name `tinyfish`, auth
`presets.auth.header("X-API-Key")` with default credentials, provider-level
`usage.consolidate = presets.usage.perCall()` (both products are free — 1
call unit, no vendor cost), and NO provider `request.baseUrl` (each endpoint
targets its own host).

#### Scenario: Free usage
- **WHEN** any tinyfish endpoint completes successfully
- **THEN** usage is `units: [{amount: 1, unit: "call"}]` with no cost

### Requirement: Multi-host endpoints
`tinyfish#search` SHALL compile to `GET https://api.search.tinyfish.ai/` and
`tinyfish#fetch` to `POST https://api.fetch.tinyfish.ai/` via per-endpoint
`request.baseUrl` overrides; both SHALL inherit the provider's auth and
usage. Search input is the query-params schema ported from v1 (cross-field
date rules documented in describes — refinements do not survive compilation);
fetch input is the ported body schema (1-10 http(s) URLs, formats, CSS
selector scoping, conditional re-fetch validators).

#### Scenario: Hosts survive compilation
- **WHEN** the bundle is compiled
- **THEN** the two docs carry the two different absolute hosts

#### Scenario: Search replay
- **WHEN** the synthetic happy fixture replays
- **THEN** the run completes with 1 call unit and the results array intact
