# Tasks

- [x] Add provider metadata, native authentication and credit pool.
- [x] Mirror the five endpoints' official request schemas.
- [x] Model base charges, empty-search minimums and all supported expansion fees.
- [x] Add replay coverage and gated live smoke tests.
- [x] Run formatting, type checking, lint and the full offline test suite.
- [x] Compile the catalog and inspect the five endpoint contracts and estimates.
- [x] Document sources, synthetic-fixture status and publishing requirements in the PR.

## Validation notes

- CompanyEnrich: 31 offline tests passed across five endpoint-local suites;
  5 live smoke tests skipped without credentials. Happy paths and expansion
  cases assert the complete `{credits, evidence}` object. Validation gates
  include passing boundary inputs (page sizes 1/100 and seed counts 1/10).
- Full offline suite: 1,276 passed, 0 failed and 218 ignored.
- Extracting shared filters preserves all five compiled endpoint documents
  and hashes, and the compiled function table exactly.
- Whole-repository type check, connector lint and formatting passed.
- Catalog compilation exposes exactly five CompanyEnrich endpoints. A 10-result
  company search with workforce estimates 60 credits (10 base + 50 expansion).
- `ids:check` reports existing upstream drift: 76 unrelated unregistered endpoint
  IDs and 7 missing/renamed IDs. The lock change is limited to the five new
  CompanyEnrich identities; no existing IDs are changed.
