# Add the CompanyEnrich connector

## Why

Expose CompanyEnrich's company enrichment, company search, lookalike discovery,
people search and reverse email lookup through Monid's existing connector contract.

## Scope

- Add one bearer-authenticated provider and five synchronous REST endpoints.
- Mirror the published OpenAPI inputs, including workforce and education expansions.
- Declare the vendor's single credit pool, search minimum charges and expansion fees.
- Add synthetic replay fixtures, credential-gated live smoke tests and bounded estimates.
- Make no engine, contract, category or version changes.

## Evidence and limits

Official references checked on 2026-10-07:

- https://docs.companyenrich.com/reference/get_companies-enrich
- https://docs.companyenrich.com/reference/post_companies-search
- https://docs.companyenrich.com/reference/post_companies-similar
- https://docs.companyenrich.com/reference/post_people-search
- https://docs.companyenrich.com/reference/post_people-lookup
- https://docs.companyenrich.com/docs/credits
- https://companyenrich.com/product/people-search-api

Input schemas follow the OpenAPI definitions embedded in those reference pages.
The API reports consumption in `x-credit-cost`, a response header unavailable to
ordinary settle hooks. As with PDL, the connector therefore uses the documented
rate-card fold and does not invent a body meter or add a lifecycle just to read it.
No authenticated vendor traffic has been recorded; fixtures are explicitly
synthetic and contain only example identities. Live tests are gated on the
standard `COMPANYENRICH_CREDENTIALS_API_KEY` / `COMPANYENRICH_API_KEY` convention.

The connector describes vendor credits, not Monid's retail dollar pricing.
Hosting, credential provisioning and catalog publication remain maintainer tasks.
