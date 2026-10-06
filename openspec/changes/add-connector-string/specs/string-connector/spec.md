# string-connector (delta)

## ADDED Requirements

### Requirement: String provider definition

The string provider SHALL declare name `string`, `request.baseUrl`
`https://request.usestring.ai/v1`, auth `presets.auth.bearer()`, and one
credit pool `default` labelled "US dollars (Growth-tier rate)". No
provider-level lifecycle or `usage.consolidate` — neither endpoint carries a
settle-time cost receipt on the response body.

### Requirement: Search bills per results page, one page unless paging is requested

`POST /search` SHALL default `engine` to `google` at the binding, model
usage as `PER_UNIT`·`PAGE` at the Growth-tier rate ($0.001/page), estimate 1
page when `searchCount` is absent or the engine is not `google`, else the
documented 10-page cap (an admission hold that settlement can never
exceed), and settle evidence from `paging.pages` when the response carries
it, else 1.

#### Scenario: No searchCount settles at exactly one page

- **WHEN** `POST /search` with `{query: "..."}` (no `searchCount`) returns a
  results body with no `paging` field
- **THEN** usage is `{credits: {default: 0.001}, evidence: {PAGE: 1}}`

#### Scenario: engine defaults to google when omitted

- **WHEN** the compiled input schema for `search` is inspected without a
  caller-supplied `engine`
- **THEN** the schema's `engine` property has default `"google"`

### Requirement: Fetch bills one of four output-determined rates

`POST /fetch` SHALL NOT expose `jsonSchema` on its input schema (its
surcharge has no published flat rate). It SHALL declare a single-tick
`lifecycle.start` (no `poll`) that performs the request, stashes the
response header `x-billed-request-type` on
`state.data.billedRequestType`, and completes with the raw response body as
output. `usage.model` SHALL be a `COMPOSITE` of four `PER_UNIT`·`RESULT`
components — `request_standard` ($0.0002), `request_premium` ($0.002),
`browser_standard` ($0.001), `browser_premium` ($0.004) — each the
Growth-tier rate for that billed class. `usage.estimate` SHALL promise the
standard-proxy component on whichever strategy (`browser_*` when
`executeJS`, `requireWSS`, `screenshot`, or a non-empty `actions` is set on
the request; `request_*` otherwise) the request itself forces.
`usage.evidence` SHALL read `state.data.billedRequestType` and settle the
one matching component, or no component when the value is absent or
unrecognized.

#### Scenario: A plain fetch settles at the request-standard rate

- **WHEN** `POST /fetch` with `{url: "https://example.test"}` (no
  browser-forcing fields) returns 200 with response header
  `x-billed-request-type: request_standard`
- **THEN** usage is
  `{credits: {default: 0.0002}, evidence: {request_standard: 1}}`

#### Scenario: A browser-rendered fetch settles at the browser-premium rate, not the cheap-floor estimate

- **WHEN** `POST /fetch` with `{url: "https://example.test", executeJS:
  true}` returns 200 with response header
  `x-billed-request-type: browser_premium`
- **THEN** the pre-call estimate names `browser_standard` (the honest
  floor) but the settled usage is
  `{credits: {default: 0.004}, evidence: {browser_premium: 1}}`

#### Scenario: A missing billed-type header settles zero rather than guessing

- **WHEN** `POST /fetch` completes but the transport does not surface
  `x-billed-request-type` on the response
- **THEN** usage evidence is `{}` and no credit line is charged

### Requirement: Test fixtures can record the billing-determining header

`shared/testing/fixtures.ts`'s `RECORDED_RES_HEADERS` allowlist SHALL
include `x-billed-request-type`, so a recorded fixture chain can carry the
one response header `fetch`'s billing model reads.

#### Scenario: A fixture with the billed-type header is accepted

- **WHEN** a fixture's recorded response includes
  `headers: {"x-billed-request-type": "browser_standard"}`
- **THEN** fixture validation accepts it, because that key is on the
  allowlist
