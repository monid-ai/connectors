# litescrape-connector (delta)

## ADDED Requirements

### Requirement: Thirty-three endpoints, one host, one key, one pool
The provider SHALL declare `https://api.litescrape.com/api`, Bearer auth,
120 s request / run timeouts, and one pool of Litescrape credits; every
endpoint SHALL be a GET whose id is the vendor's `<engine>/<kind>` path
and whose line is PER_UNIT·RESULT drawing one credit.

#### Scenario: The compiled catalog
- **WHEN** the bundle compiles
- **THEN** exactly 33 `litescrape#…` docs exist, each with
  `request.url = https://api.litescrape.com/api/<id path>`, the same
  inject / toRequest / fromError / estimate fn keys, no `consolidate`, no
  `fromResponse`, and an evidence fn authored in its own endpoint file

### Requirement: A call with results draws one credit; an empty success draws none
Each endpoint SHALL count 1 when the 2xx body carries one of its result
groups (a non-empty array, string, or object, or a non-null scalar) and 0
otherwise.

#### Scenario: A Google search with organic results
- **WHEN** `google/search` answers 200 with a non-empty `organic_results`
- **THEN** `usage` is `{credits: {default: 1}, evidence: {RESULT: 1}}`

#### Scenario: A review page past the end
- **WHEN** `apple/app-store/reviews` answers 200 with `reviews: []`
- **THEN** `usage` is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: A place without busyness data
- **WHEN** `google/maps/popular-times` answers 200 with
  `popular_times: null`
- **THEN** `usage` is `{credits: {}, evidence: {RESULT: 0}}`

### Requirement: The vendor's follow-up links reach the caller verbatim
The output SHALL be the vendor's body unchanged, including every
`https://api.litescrape.com/api/...` link, and every doc SHALL carry the
provider note that maps such a link's path to an endpoint id.

#### Scenario: A Maps search page
- **WHEN** `google/maps` answers 200 with `pagination.next` and a
  `reviews_link` on a result
- **THEN** `output` deep-equals the response body

### Requirement: Array parameters travel comma-separated
`apple/maps/places` `muid`, `yelp/reviews` `rating`, and `yelp/search`
`attrs` SHALL be arrays in the schema and one comma-joined value on the
wire.

#### Scenario: Two Apple place ids
- **WHEN** `muid: ["4372355869446211302", "4560078147072908047"]`
- **THEN** the request URL carries
  `muid=4372355869446211302%2C4560078147072908047` once

### Requirement: The vendor's one-of rules survive compilation
Every "at least one of" rule SHALL compile as `anyOf` of `required` arms;
every "exactly one of" rule SHALL additionally omit the other field from
each arm; every other cross-field rule SHALL ride `meta.notes`.

#### Scenario: A Maps request with a query but no type
- **WHEN** `google/maps` receives `{q: "coffee"}`
- **THEN** the run is rejected INVALID_INPUT before the wire

#### Scenario: Both review identifiers
- **WHEN** `google/reviews` receives `{place_id, data_id}`
- **THEN** the run is rejected INVALID_INPUT before the wire

### Requirement: Single-field bounds are gates
`muid` SHALL reject any decimal above 18446744073709551615; URL fields
SHALL reject non-http(s) values; every mirror SHALL be strict.

#### Scenario: One past the 64-bit maximum
- **WHEN** `apple/maps/reviews` receives `muid: "18446744073709551616"`
- **THEN** the run is rejected INVALID_INPUT

### Requirement: Vendor errors are data
Every non-2xx SHALL settle as a provider error with zero usage and the
stable error body digested to `{message, error_code, raw}`.

#### Scenario: No AI Overview
- **WHEN** `google/ai-overview` answers 404 `not_found`
- **THEN** `isProviderError` is true, `usage` is
  `{credits: {}, evidence: {}}`, and `output.error_code` is `not_found`
