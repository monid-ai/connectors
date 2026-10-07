# CompanyEnrich connector

## Requirements

### Native request contract

The provider SHALL call `https://api.companyenrich.com` with bearer authentication.
It SHALL expose `GET /companies/enrich`, `POST /companies/search`,
`POST /companies/similar`, `POST /people/search` and `POST /people/lookup`.
Inputs SHALL mirror official field names, optionality, nullability, enums and bounds.
Search `pageSize` SHALL be required at the binding so cost estimates have an
explicit result cap. Query `expand` SHALL remain an array serialized as repeated
query parameters, without a custom request mapper. Responses SHALL pass through.

#### Scenario: Missing result cap
- WHEN a search omits `pageSize`
- THEN validation fails before an upstream request.

#### Scenario: Company discovery by meaning
- WHEN company search supplies `semanticQuery` and firmographic filters
- THEN both are sent unchanged in the JSON body.

### Complete usage model

The provider SHALL declare one `default` credit pool. Successful enrichment SHALL
cost 1 credit; successful email lookup SHALL cost 5. Company search, lookalikes and
people search SHALL cost 1, 5 and 2 credits respectively per returned item, with a
minimum equivalent to one item on a successful empty page. Workforce expansion
SHALL add 5 credits per returned company and education expansion SHALL add 1 credit
per returned person. Estimates SHALL use requested page size; settlement SHALL use
the response `items` length, not the total number of matches. Expansions on empty
pages SHALL cost zero. Duplicate expansion values SHALL not multiply the surcharge.

#### Scenario: Empty people search with education
- WHEN a 200 response has `items: []` and education was requested
- THEN the base minimum is 2 credits and the education charge is zero.

#### Scenario: Partial page with workforce
- WHEN company search requests 10 results with workforce and returns 2
- THEN the estimate is 60 credits and settled usage is 12 credits.

#### Scenario: Provider error
- WHEN any endpoint returns a non-2xx response, including a 404 enrichment miss
- THEN the raw error remains available and usage is zero.

### Tests and disclosure

Tests SHALL execute compiled sealed units and cover request URLs and bodies,
estimates, successful and empty results, expansions, input gates and vendor errors.
Synthetic fixtures SHALL use a `synthetic-` prefix and describe their origin.
Live smoke tests SHALL skip unless CompanyEnrich credentials are configured.
The contribution SHALL disclose that no live fixture recording was performed.
