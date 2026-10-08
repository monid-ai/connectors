# Tasks: add-connector-jobspipe

## 1. Drill the vendor surface

- [x] 1.1 Capture the published OpenAPI (docs.jobspipe.dev, 2026-10-07):
      base url, bearer auth, the four request schemas, the
      `JobSearchResponse` / `AgenticSearchResponse` metadata, the error
      envelope
- [x] 1.2 Pin the card from the docs and the API source: 1 credit per
      posting returned on both searches, already-paid postings free for the
      calendar month, flat 1 per call on the lookup, 1 on a scan that
      detected something and 0 on one that did not (`settleFlat`), nothing
      on an empty page or any non-2xx
- [x] 1.3 Locate the meter: `metadata.credits_charged` on the two searches
      (absent for unmetered callers); no meter on the lookup or the scan
- [x] 1.4 Settle the open questions: `blur_company_data` is deprecated and
      ignored (dropped); `limit` is clamped to the plan's page size, not
      refused; unknown filter names are a 400; `order_by` accepts only
      posted_at desc

## 2. Provider

- [x] 2.1 `provider.ts`: bearer auth, baseUrl, timeouts, one pool,
      consolidate (pluck `$.metadata.credits_charged`), generic evidence
      (count `$.data` on PER_UNIT), `output.fromError`, operational notes

## 3. Endpoints (4)

- [x] 3.1 `jobs-search` — strict mirror of `JobSearchRequest` minus the
      deprecated flag, with the published bounds (10 technology slugs,
      non-negative revenue, 1–50 LEIs, one sort key); `limit` required;
      COMPOSITE of two PER_UNIT · RESULT lines (`postings`, `technologies`);
      estimate = limit, doubled under `include_technologies`; own evidence
      that folds `jobs_already_paid` / `technologies_already_paid` out
- [x] 3.2 `agentic-search` — strict mirror of `AgenticSearchRequest` with an
      open `filters` record; `limit` required (1–25); PER_UNIT · RESULT;
      45 s timeout (vendor: up to about 30 s)
- [x] 3.3 `company-lookup` — `GET /v1/companies/{key}` path param mirror;
      PER_CALL 1 (quantities fns synthesized)
- [x] 3.4 `stack-scan` — strict mirror of `StackScanRequest`; PER_UNIT ·
      CREDIT with a 0/1 evidence on `detected`; 45 s timeout

## 4. Fixtures + tests

- [x] 4.1 Recorded chains via `deno task record` (2026-10-07/08, trimmed):
      search happy / empty / technologies (`include_technologies`), agentic
      happy, lookup happy / 404, scan happy / empty / 400. Synthetic
      (`synthetic-` prefix) where a recording is not reachable from one
      account: search already-paid and all-already-paid (the recording key
      is unmetered, so the vendor never discounts it), search 402, agentic
      503
- [x] 4.2 Per-endpoint replay tests: happy usage with the whole output
      deep-equalled to the fixture body on the flat docs, the already-paid
      folds (partial and full), the technologies line, empty page, provider
      error digest, binding gates and published bounds, estimates
- [x] 4.3 Provider-level `provider.test.ts`: the four ids, interned
      inject / consolidate / evidence, one pool, the card by kind, the wire
      form
- [x] 4.4 Gated live tests on every endpoint (`JOBSPIPE_API_KEY`), shape
      not amounts
- [x] 4.5 `deno task test:live` green against a real key (all four)

## 5. Wiring + docs

- [x] 5.0 Review round (PR #98, 2026-10-08): technologies surcharge modelled,
      already-paid rows folded out (a zero claim is pruned at settle),
      input bounds, 45 s timeouts with the vendor's numbers, test style per
      the path rules; the stack-scan 0/1 card stands — the vendor's own page
      says a scan that detects nothing costs nothing

- [x] 5.1 The four ids in `connectors/ids.lock.json`
- [x] 5.2 Verify: fmt · lint · check · test · ids:check (the jobspipe
      entries; the lock's pre-existing bytedance / fundable / suzanne drift
      is upstream's) · catalog smoke
