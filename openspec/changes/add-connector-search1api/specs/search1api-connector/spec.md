# search1api-connector (delta)

## ADDED Requirements

### Requirement: Search1API provider definition
The search1api provider SHALL declare name `search1api`,
`request.baseUrl` `https://api.search1api.com`, auth
`presets.auth.bearer()`, a single `default` credit pool labelled
"Search1API credits", and a provider-level `output.fromError` that reads
`detail`, then `title`, then `message` from the error envelope.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `search1api#search`, `search1api#news`,
  `search1api#crawl`, `search1api#sitemap`, and `search1api#trending`
  exist

### Requirement: Per-call billing with a deep-search meter
Every endpoint SHALL consume 1 `default` credit per call, except that
`search`, `news`, `sitemap` and `trending` SHALL bill that credit only
when the response's result list (`results`, or `links` for `sitemap`) is
non-empty — an empty answer is free to the buyer. `crawl` SHALL stay a
flat PER_CALL. `search` and `news` SHALL additionally model "Deep
Search" as a COMPOSITE: a `call` component counted off the response plus
a `crawled_page` PER_UNIT component (1 credit per
successfully crawled page — the vendor rate card,
https://s1.dev/pricing, verified 2026-09-17) whose estimate is the
requested `crawl_results` capped by `max_results` and whose evidence
counts results carrying a `content` field. No `consolidate` (the vendor
reports no per-response meter — the derived fold is the bill).

#### Scenario: Flat settle
- **WHEN** a `search1api#search` run with `crawl_results` unset returns
  200
- **THEN** usage is `{credits: {default: 1}, evidence: {call: 1}}`

#### Scenario: Deep-search settle
- **WHEN** a `search1api#search` run with `crawl_results: 2` returns 2
  results carrying `content`
- **THEN** usage is
  `{credits: {default: 3}, evidence: {call: 1, crawled_page: 2}}`

#### Scenario: Empty results are free
- **WHEN** a `search1api#search` run returns 200 with `results: []`
- **THEN** usage is `{credits: {}, evidence: {call: 0}}`

#### Scenario: Errors are free
- **WHEN** the vendor answers 401
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}`

### Requirement: Faithful input mirrors
`/search` and `/news` bodies SHALL mirror the vendor's OpenAPI object
variant — including the `""` enum entries (the documented "default
backend" spelling) — with `query` required. `/crawl` SHALL require `url`
and mirror `enableFallback`. `/sitemap` SHALL require `url` and mirror
`type` (`sitemap`|`all`). `/trending` SHALL require `search_service` —
enumerated `github`|`hackernews`, the only values the vendor documents —
and mirror optional `max_results`. Batch-array variants SHALL NOT be
exposed. Every body SHALL be strict — an unknown key fails INVALID_INPUT
(the vendor's OpenAPI declares `additionalProperties: false`).

#### Scenario: Unknown key rejected
- **WHEN** a caller passes a misspelled field (e.g. `max_result`) to
  `search1api#search`
- **THEN** the run fails with INVALID_INPUT before any network call

#### Scenario: Unknown engine rejected
- **WHEN** a caller passes `search_service: "not-an-engine"` to
  `search1api#search`
- **THEN** the run fails with INVALID_INPUT before any network call
