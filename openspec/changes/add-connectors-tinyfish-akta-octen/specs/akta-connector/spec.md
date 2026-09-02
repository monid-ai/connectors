# akta-connector (delta)

## ADDED Requirements

### Requirement: Akta provider definition with shared hooks
The akta provider SHALL declare name `akta`, `request.baseUrl`
`https://api.akta.pro/api` (the `/api` path prefix MUST survive url
resolution), auth `presets.auth.header("x-api-key")`, a provider-level
`input.toRequest` that renders every ARRAY query-param leaf as ONE
comma-separated value, and a provider-level `usage.consolidate` that settles
in Akta's NATIVE unit: `units` = the response's `credits_consumed` credits,
`cost` = `fromDollars(credits / 20)` ($1 = 20 credits), `evidence` keeps the
raw field, and `credits_consumed` is absorbed from the output.

#### Scenario: Credit settlement
- **WHEN** a response carries `credits_consumed: 2.5`
- **THEN** usage is 2.5 credit units + 125000 micro-dollars, and the output
  lacks `credits_consumed`

#### Scenario: Arrays go comma-separated
- **WHEN** a caller passes `sentiment_list: ["positive", "neutral"]`
- **THEN** the wire request carries `sentiment_list=positive,neutral`

### Requirement: Six endpoints inheriting everything
The connector SHALL provide six GET endpoints — company-search,
company-enrichment, news, industry-search, product-reviews, and
employee-reviews — each declaring only meta + request + the ported
query-params schema; auth, toRequest, and usage SHALL resolve from the
provider, interning ONE fn each across all six docs.

#### Scenario: Shared interning
- **WHEN** the bundle is compiled
- **THEN** all six docs reference the same consolidate, toRequest, and
  auth.inject fn ids
