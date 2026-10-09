# contextdev-connector (delta)

## ADDED Requirements

### Requirement: Nineteen synchronous endpoints on one wire surface
The connector SHALL expose the scrape family (`web/scrape/markdown`,
`web/scrape/html`, `web/scrape/images`, `web/scrape/sitemap`,
`web/screenshot`), `web/crawl`, `web/search`, `web/extract`,
`brand/retrieve`, `brand/search`, `utility/prefetch`, `people/enrich`,
`news/search`, `web/naics`, `web/sic`, `web/fonts`, `web/styleguide`,
`brand/ai/product` and `brand/ai/products`, every one a single request
against `https://api.context.dev/v1` with Bearer auth, and SHALL NOT declare
a lifecycle. The provider SHALL be named `contextdev`.

#### Scenario: Ids derive from the wire path
- **WHEN** the bundle compiles
- **THEN** `GET /web/scrape/markdown` is `contextdev#web/scrape/markdown` and
  `POST /brand/retrieve` is `contextdev#brand/retrieve`, with no pinned ids

### Requirement: The vendor's credit count is the claim and the envelope never leaves
`usage.credits` SHALL declare one pool, `default`, in Context.dev credits.
The provider `usage.consolidate` SHALL claim `key_metadata.credits_consumed`
when it is a number, claim nothing otherwise, and SHALL remove the whole
`key_metadata` object from the output. `output.fromError` SHALL digest a
provider error as `{message, error_code?, raw}` with `key_metadata` removed
from `raw`.

#### Scenario: A page scrape settles the vendor's count
- **WHEN** `web/scrape/markdown` answers 200 with `credits_consumed: 1`
- **THEN** `usage` is `{credits: {default: 1}, evidence: {CALL: 1}}` and the
  output has no `key_metadata`

#### Scenario: A call billed above list settles the vendor's count with a cross-check
- **WHEN** the same call answers `credits_consumed: 2`
- **THEN** `usage.credits` is `{default: 2}` and `usage.mismatch.derived` is
  `{default: 1}`

#### Scenario: A zero claim prunes and the list rate settles
- **WHEN** `brand/retrieve` answers 200 with `credits_consumed: 0` (cached)
- **THEN** `usage.credits` is `{default: 10}`

#### Scenario: An error body never reveals the balance
- **WHEN** any endpoint answers 400 `{message, error_code, key_metadata,
  request_id}`
- **THEN** `isProviderError` is true, `usage` is `{credits: {}, evidence:
  {}}`, and the output is `{message, error_code, raw}` where `raw` has no
  `key_metadata`

### Requirement: Metered lines count what the vendor bills
`web/crawl` SHALL bill per page (`metadata.numSucceeded`, a strict read —
`results[]` also lists failed pages); `web/search` and `news/search` SHALL bill one credit
per block of ten delivered results (`every: 10`); `people/enrich` SHALL bill
per candidate (`match.status === "candidate"`); `web/scrape/sitemap` SHALL
add one credit when the request carries `search`. `maxPages`, `numResults`
and `limit` SHALL be required at the binding.

#### Scenario: A crawl bills only the pages that succeeded
- **WHEN** a crawl of four URLs reports `numSucceeded: 3`
- **THEN** evidence is `{PAGE: 3}` and credits fold to 3

#### Scenario: A searched sitemap crawl holds and bills two credits
- **WHEN** `web/scrape/sitemap` is estimated with `search: "pricing"`
- **THEN** the estimate is `{search_surcharge: 1}`, two credits, and a run
  settles `evidence {search_surcharge: 1, crawl: 1}`

#### Scenario: A not-found person is free
- **WHEN** `people/enrich` answers `match.status: "not_found"` with
  `credits_consumed: 0`
- **THEN** `usage` is `{credits: {}, evidence: {RESULT: 0}}`

### Requirement: Vendor one-of rules are enforced before the wire
`brand/retrieve` SHALL accept exactly one `type`-discriminated lookup body;
`people/enrich` SHALL require an email, a social profile URL, or a name plus
company, education, or location; `web/screenshot`, `web/fonts`,
`web/styleguide` and `brand/ai/products` SHALL require a domain or a direct
URL; `utility/prefetch` SHALL require a domain or an email; `news/search`
SHALL require one typed entity. Each SHALL compile as `anyOf` arms with
`additionalProperties: false`.

#### Scenario: A name alone does not enrich a person
- **WHEN** `people/enrich` receives only `name`
- **THEN** the run is rejected INVALID_INPUT

#### Scenario: A lookup without a type is rejected
- **WHEN** `brand/retrieve` receives `{domain}` without `type`
- **THEN** the run is rejected INVALID_INPUT

### Requirement: Channels the engine cannot carry stay closed
The GET endpoints SHALL NOT accept `pdf`, `actions`, `enrichment`,
`viewport`, `headers`, `includeSelectors`, `excludeSelectors` or
`timeoutOpts`; no endpoint SHALL accept `tags`; `/parse` SHALL NOT be
exposed.

#### Scenario: Image enrichment is rejected locally
- **WHEN** `web/scrape/images` receives `enrichment: {resolution: true}`
- **THEN** the run is rejected INVALID_INPUT

### Requirement: Brand search hides the organization's logo links
`brand/search` SHALL be FREE and its `output.fromResponse` SHALL remove
`logo` from every result.

#### Scenario: Results carry domain and name only
- **WHEN** the vendor answers results with `logo` links
- **THEN** the output results are `{domain, name}` and `usage` is
  `{credits: {}, evidence: {}}`
