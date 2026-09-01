# exa-connector (delta)

## ADDED Requirements

### Requirement: Exa provider definition
The exa provider SHALL declare name `exa` (loader-asserted against the folder), meta with a one-line `summary` and
a full `description` (AI-native web search and content extraction), a
`docsUrl` that endpoints inherit, `auth: {inject:
presets.auth.header("x-api-key")}` with credentials omitted (the default
apiKey shape applies), flat `request: {baseUrl: "https://api.exa.ai"}`, and
default timeouts (30s request, 30s run).

#### Scenario: Provider doc
- **WHEN** the bundle is compiled
- **THEN** it contains an exa ProviderDoc indexing `exa#search` and `exa#contents`

### Requirement: exa#search endpoint
`exa#search` SHALL POST `/search` with the validated request body (zod ported
from the v1 adaptor, drift fixed). The `stream` flag SHALL NOT be exposed to
callers (absent from the schema and the compiled JSON Schema); because the
body schema is deliberately non-strict, `input.toRequest` SHALL additionally
strip `stream` before send as defense-in-depth. ONE settle fn
(`usage.consolidate`) SHALL report result-count `Unit.RESULT` measures plus
vendor-reported `costDollars.total` (read via `optionalNum` — sometimes
absent) converted with `utils.money.fromDollars` into a micro-dollar
MonetaryValue cost, keep `costDollars` and `requestId` as `evidence`, and
return the output with `costDollars` absorbed (engine-executed, every
operator). Meta SHALL carry the full capability description (search types,
categories, filters, inline contents extraction).

#### Scenario: Happy replay
- **WHEN** the recorded happy fixture (3 results, costDollars.total 0.005) replays
- **THEN** usage is `units: [{amount: 3, unit: "result"}]`,
  `cost: {currency: "USD", value: 5000, unit: "MICRO_DOLLAR"}`, and the
  output no longer carries `costDollars` (consolidated)

#### Scenario: stream not exposed
- **WHEN** the compiled input schema is inspected
- **THEN** it has no `stream` property, and a pasted v1 payload containing
  `stream: true` still runs (stripped before send)

#### Scenario: Vendor 401
- **WHEN** the provider-error fixture replays
- **THEN** the run completes with `isProviderError: true` and zero usage

### Requirement: exa#contents endpoint
`exa#contents` SHALL POST `/contents` with the validated body and the same
settle behavior as search; its meta SHALL describe the LLM-ready
content capability (full text, highlights, summaries, subpage crawling,
maxAgeHours) and point callers to /search when URLs are unknown.

#### Scenario: Shared fn interning
- **WHEN** the bundle is compiled
- **THEN** search and contents reference the same ad-hoc settle-fn entry
  and the same provider auth entry
