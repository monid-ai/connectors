# Tasks

- [x] Add provider metadata, native authentication and credit pool.
- [x] Mirror the five endpoints' official request schemas.
- [x] Model base charges, empty-search minimums and all supported expansion fees.
- [x] Add replay coverage and gated live smoke tests.
- [x] Run formatting, type checking, lint and the full offline test suite.
- [x] Compile the catalog and inspect the five endpoint contracts and estimates.
- [x] Document sources, synthetic-fixture status and publishing requirements in the PR.

## Validation notes

- CompanyEnrich: 29 offline tests passed; 5 live smoke tests skipped without credentials.
- Full offline suite: 1,274 passed, 0 failed and 218 ignored.
- Whole-repository type check, connector lint and formatting passed.
- Catalog compilation exposes exactly five CompanyEnrich endpoints. A 10-result
  company search with workforce estimates 60 credits (10 base + 50 expansion).
- `ids:check` reports existing upstream drift: 76 unrelated unregistered endpoint
  IDs and 7 missing/renamed IDs. The lock change is limited to the five new
  CompanyEnrich identities; no existing IDs are changed.
