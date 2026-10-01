# linkup-connector (delta)

## ADDED Requirements

### Requirement: Linkup provider definition
The linkup provider SHALL declare name `linkup`, `request.baseUrl`
`https://api.linkup.so/v1`, auth `presets.auth.bearer()`, timeouts 120 s
request / 120 s run, a single `default` credit pool labelled "US dollars",
no `usage.consolidate` (Linkup reports no per-response meter), and an
`output.fromError` that digests `{error: {code, message, details},
statusCode}` into `{message, code?, raw}`.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `linkup#search` and `linkup#fetch` exist

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** either endpoint receives a 401
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the output is `{message, code, raw}`

### Requirement: Search is priced by depth and output type
`linkup#search` SHALL declare a COMPOSITE model with the lines `search`
($0.005), `answer` ($0.006), `deep_search` ($0.05) and `deep_answer`
($0.055), and estimate and evidence SHALL count exactly one of them from
the request: `deep_*` when `depth` is `deep`, `*_search` when `outputType`
is `searchResults`, `*_answer` otherwise. The binding SHALL default
`depth` to `standard` and `outputType` to `searchResults`.

#### Scenario: Default search
- **WHEN** `linkup#search` runs with only `q` and returns 200
- **THEN** usage is `{credits: {default: 0.005}, evidence: {search: 1}}`

#### Scenario: Deep structured search
- **WHEN** `linkup#search` runs with `depth: "deep"` and
  `outputType: "structured"`
- **THEN** usage is `{credits: {default: 0.055}, evidence: {deep_answer: 1}}`

### Requirement: Fetch is priced by mode, rendering and schema
`linkup#fetch` SHALL declare a COMPOSITE model with the lines `standard`
($0.001), `standard_render_js` ($0.005), `pro` ($0.005), `pro_render_js`
($0.01) and `structured_output` ($0.001). Estimate and evidence SHALL count
exactly one of the first four from `mode` × `renderJs`, plus
`structured_output` when `schema` is present. The binding SHALL default
`mode` to `standard` and `renderJs` to `false`.

#### Scenario: Default fetch
- **WHEN** `linkup#fetch` runs with only `url` and returns 200
- **THEN** usage is `{credits: {default: 0.001}, evidence: {standard: 1}}`

#### Scenario: Pro, rendered, structured
- **WHEN** `linkup#fetch` runs with `mode: "pro"`, `renderJs: true` and a
  `schema`
- **THEN** evidence is `{pro_render_js: 1, structured_output: 1}` and the
  card is $0.011

### Requirement: Inputs mirror the OpenAPI request bodies
Each `schema/inputs.ts` SHALL mirror its OpenAPI request body with
optionality only, as a strict object.

#### Scenario: Unknown fields are rejected before the wire
- **WHEN** either endpoint runs with a field the spec does not declare, or
  an enum value it does not list
- **THEN** the run fails with `INVALID_INPUT` and no request is sent

### Requirement: Shared fns intern
On each endpoint, `usage.estimate` and `usage.evidence` SHALL intern to one
fnTable entry, and the two endpoints SHALL share one `auth.inject` and one
`output.fromError` entry.
