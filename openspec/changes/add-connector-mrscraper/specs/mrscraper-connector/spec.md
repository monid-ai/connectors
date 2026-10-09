# mrscraper-connector (delta)

## ADDED Requirements

### Requirement: Two products, one provider
The provider SHALL declare the marketplace host
(`https://sync.scraper.mrscraper.com`), Bearer auth, and the marketplace
envelope hooks; every playground endpoint SHALL override the host
(`https://api.mrscraper.com`), the auth (`x-api-token` header), the
request shaping, the usage model, and the response hooks. Every endpoint
SHALL be a single synchronous POST and SHALL carry v1's published id.

#### Scenario: TripAdvisor rides its own host
- **WHEN** the bundle compiles
- **THEN** `mrscraper#tripadvisor/reviews` posts to
  `https://tvlk.mrscraper.com/api/hotels/tripadv/review/sync` with the
  provider's Bearer inject

#### Scenario: Seven presets on one wire path
- **WHEN** the bundle compiles
- **THEN** `mrscraper#scrape/html` … `mrscraper#scrape/map` all post to
  `https://api.mrscraper.com/`, each with its own pinned id and query flags

### Requirement: The playground preset is applied by the connector
Each playground endpoint's `toRequest` SHALL add the preset's query flags
and `saveResult=false`, move `geoCode`, `proxyCountry`, `browserRendering`,
`waitUntil`, `timeout`, `blockResources`, `waitForSelector`, `super` (and
`screenshot`) from the body to the query string, and pin the AI agent in
the body where the preset has one.

#### Scenario: Options ride the query string
- **WHEN** `scrape/html` is called with `{url, geoCode: "de",
  browserRendering: true}`
- **THEN** the wire URL is `https://api.mrscraper.com/?html=true&saveResult=
  false&geoCode=de&browserRendering=true` and the body is `{url}`

#### Scenario: The agent cannot be chosen
- **WHEN** `scrape/extract` receives `agent: "listing"`
- **THEN** the run is rejected INVALID_INPUT

### Requirement: The pool is MrScraper tokens
`usage.credits` SHALL declare one pool, `default`, in MrScraper tokens.
Each marketplace endpoint SHALL be `PER_UNIT`·`RESULT` at its v1 token
count; each playground endpoint SHALL be `PER_UNIT`·`TOKEN` at 1 with its
v1 hold.

#### Scenario: A playground run bills the vendor's meter
- **WHEN** `scrape/markdown` answers 200 with `token_usage: 2`
- **THEN** `usage` is `{credits: {default: 2}, evidence: {TOKEN: 2}}`

#### Scenario: A listing hold grows with pages
- **WHEN** `scrape/listing` is estimated with `maxPages: 5`
- **THEN** the estimate is `{TOKEN: 130}`

### Requirement: Usable data is the billing condition
On a marketplace endpoint the provider `consolidate` SHALL claim
`tokenUsage` only when the body carries usable data, and the generic
`evidence` SHALL count `RESULT: 1` only then; `success: false`, a missing,
null, or empty `data`, or `data.status: "FAIL"` SHALL record zero.

#### Scenario: A soft failure is free
- **WHEN** `google/hotel` answers 200 with `data: {status: "FAIL"}` and
  `tokenUsage: 10`
- **THEN** `usage` is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: A page with no reviews is free
- **WHEN** `agoda/reviews` answers 200 with `data: {url, total_reviews: 0,
  reviews: []}` and `tokenUsage: 41`
- **THEN** `usage` is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: A usable run settles the vendor's count
- **WHEN** `serp/google` answers 200 with organic results and
  `tokenUsage: 3`
- **THEN** `usage.credits` is `{default: 3}` and `usage.mismatch.derived`
  is `{default: 1}`

### Requirement: The caller gets the inner data
The provider `fromResponse` SHALL return the marketplace envelope's `data`
(the whole body when there is no `data` key); the playground endpoints
SHALL return the body without `token_usage`, `residential_proxy_usage`,
`data_path`, `html_path` and `listen_network_data`.

#### Scenario: The envelope is gone
- **WHEN** `youtube/video` answers `{success, message, data, tokenUsage}`
- **THEN** the output is `data`

### Requirement: Site gates survive compilation
Every URL-input marketplace endpoint SHALL constrain `url` with a compiled
`pattern` that accepts only hosts whose registrable label is the site's
brand and, where v1 gated the path, only that path shape.

#### Scenario: A path marker may follow other segments
- **WHEN** `amazon/product` receives `https://www.amazon.com/Example-
  Earbuds/dp/B0CP9YB3Q4`
- **THEN** the gate passes; `https://www.amazon.com/s?k=laptop` is
  rejected INVALID_INPUT

#### Scenario: A lookalike host is rejected
- **WHEN** `google/hotel` receives `https://google.attacker.example/travel/
  hotels/entity/X`
- **THEN** the run is rejected INVALID_INPUT

### Requirement: Shein renders by default
`shein/product` SHALL bind `render` to the vendor default `false` so the
wire always carries the marketplace-required flag; a caller MAY set it
to `true`.

#### Scenario: The default is compiled
- **WHEN** the bundle compiles
- **THEN** `mrscraper#shein/product`'s body schema has `render.default ===
  false`

### Requirement: Vendor errors are data
A non-2xx MrScraper response SHALL settle as a provider error with zero
usage and its body relayed verbatim.

#### Scenario: A hard failure
- **WHEN** a scraper answers 500 `{success: false, message}`
- **THEN** `isProviderError` is true and `usage` is `{credits: {}, evidence: {}}`
