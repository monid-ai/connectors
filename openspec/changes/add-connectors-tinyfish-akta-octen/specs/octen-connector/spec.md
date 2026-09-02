# octen-connector (delta)

## ADDED Requirements

### Requirement: Octen provider definition (live surface only)
The octen provider SHALL declare name `octen`, `request.baseUrl`
`https://api.octen.ai`, auth `presets.auth.header("x-api-key")`, and NO
provider-level usage (each endpoint's meter differs). Only the four
endpoints v1 had ENABLED SHALL be ported: search, broad-search, extract,
embedding — the seven v1-disabled endpoints are out of scope until the
pricing pass.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `octen#search`, `octen#broad-search`, `octen#extract`,
  and `octen#embedding` exist

### Requirement: Receipt-driven native metering
Each endpoint's `usage.consolidate` SHALL read the `meta.usage.*` receipt:
search = 1 call + `full_content_tokens` tokens when present; broad-search
SHALL settle on the receipt's `num_search_queries` as result units — only
when the receipt omits it SHALL it fall back to the request's
`max_queries`, and only when that is also absent to 5 (the vendor default)
— plus the token tier; extract = `successful_urls` result units (missing receipt →
0 — money follows evidence); embedding = `input_tokens` token units.
`evidence` SHALL keep the receipt verbatim and the meter block SHALL be
absorbed from the output.

#### Scenario: Gated token tier
- **WHEN** a search response carries `meta.usage.full_content_tokens: 3210`
- **THEN** usage units are `[{1 call}, {3210 token}]` and `meta.usage` is
  absent from the output

#### Scenario: Failed URLs are free
- **WHEN** an extract response reports `successful_urls: 1` of 2 sent
- **THEN** usage is 1 result unit

### Requirement: Strictness carries the stream rejection
The LLM-shaped inputs' `.strict()` schemas SHALL compile to
`additionalProperties: false`, so unsupported flags (e.g. `stream`) fail
input validation — no defensive toRequest strip is needed.

#### Scenario: Unknown key rejected
- **WHEN** a caller passes an unknown body key to octen#search
- **THEN** the run fails with INVALID_INPUT before any network call
