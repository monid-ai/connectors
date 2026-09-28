# adlegends-connector (delta)

## ADDED Requirements

### Requirement: Ad Legends provider wraps hosted MCP, not a invented REST API
The adlegends provider SHALL declare name `adlegends`, `request.baseUrl`
`https://www.adlegends.ai`, `request.headers.Accept`
`application/json, text/event-stream`, auth `presets.auth.bearer()`,
timeouts 30 s request / 60 s run, usage model `FREE` (no credit pool, no
`usage.consolidate`), a provider-level `lifecycle.start` that relays the
compiled request and synthesizes a JSON-RPC `error` or `result.isError`
on HTTP 200 as COMPLETED `httpStatus` 400 with `providerHttpStatus` 200,
a provider-level `output.fromResponse` that unwraps
`result.structuredContent` (else `result`), and a provider-level
`output.fromError` that normalizes `{error:{code,message}}` or tool
`content[0].text` into `{message, code?, raw}`.

#### Scenario: Structured content is unwrapped
- **WHEN** any endpoint receives HTTP 200
  `{jsonrpc, result:{structuredContent:{ok:true}}}`
- **THEN** the output is `{ok:true}` and usage is
  `{credits: {}, evidence: {}}`

#### Scenario: JSON-RPC error on HTTP 200 is provider-error data
- **WHEN** any endpoint receives HTTP 200 `{error:{code:-32602,message}}`
- **THEN** the result is `httpStatus` 400, `providerHttpStatus` 200,
  `isProviderError` true, usage `{credits: {}, evidence: {}}`, and the
  output is `{message, code:-32602, raw}`

#### Scenario: Missing Bearer is 401 data
- **WHEN** any endpoint receives HTTP 401
  `{error:{code:-32001,message:"Missing or malformed Bearer token"}}`
- **THEN** `isProviderError` is true, usage is
  `{credits: {}, evidence: {}}`, and the output message is that string

### Requirement: Shared MCP path, tool-named identities
Every endpoint SHALL POST `/api/mcp/brands` and SHALL declare
`endpoint: "/<tool>"` so the public id is `adlegends#<tool>`.
`input.toRequest` SHALL wrap the validated body as JSON-RPC
`tools/call` with that tool name. The eleven tools SHALL be
`get_started`, `whoami`, `get_credit_status`, `list_brands`,
`get_brand`, `get_brand_memory`, `create_brand_from_url`,
`create_manual_brand`, `create_ads`, `get_ad_session`,
`list_ad_sessions`.

#### Scenario: The compiled catalog
- **WHEN** the bundle compiles
- **THEN** exactly 11 `adlegends#…` docs exist, each with
  `request.url = https://www.adlegends.ai/api/mcp/brands`, the same
  interned `lifecycle.start` / `fromResponse` / `fromError` keys, FREE
  usage, no `consolidate`, and a default `apiKey` credential

#### Scenario: create_brand_from_url keeps the long budget
- **WHEN** `adlegends#create_brand_from_url` is inspected
- **THEN** timeouts are 120 s request / 130 s run

### Requirement: Inputs mirror hosted MCP argument schemas
Every `schema/inputs.ts` SHALL mirror the hosted MCP `tools/list`
argument schema with optionality only — no `.default()`, no invented
fields. `create_ads` SHALL require `brandId`, `targetAudience`,
`keyMessage`, and `tone`. `create_brand_from_url` SHALL require `url`.
`create_manual_brand` SHALL require `name` and `requestId`. Empty-arg
tools (`whoami`, `list_brands`) SHALL accept an empty object body.

#### Scenario: Unbounded create_ads is refused before the wire
- **WHEN** `adlegends#create_ads` runs without `tone`
- **THEN** the run fails INVALID_INPUT before any wire call

#### Scenario: whoami with an empty body
- **WHEN** `adlegends#whoami` runs with `{body: {}}`
- **THEN** the run is accepted and `toRequest` sends
  `arguments: {}`

### Requirement: Categories stay on existing leaves
Provider and endpoints SHALL use only `agents` and `image-generation`.
Fast Ads endpoints SHALL include `image-generation`; account and brand
endpoints SHALL use `agents`. No new leaf SHALL be added.

#### Scenario: create_ads is generative
- **WHEN** `adlegends#create_ads` is inspected
- **THEN** `meta.categories` includes `image-generation` and `agents`
