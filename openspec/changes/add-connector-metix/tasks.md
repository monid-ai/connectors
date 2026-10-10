# Tasks: add-connector-metix

## 1. Drill the vendor surface

- [x] 1.1 Read the live contract (`GET /contract`, `schemaVersion`
      `mira-api-contract-blueprint/v1`, `apiVersion` 2.1.2, `contract_hash`
      `08f0406173520512`): 15 routes, the request and response shape of each,
      and the per-route `quota` block
- [x] 1.2 Transcribe the rate card at `priceVersion`
      `usage-pricing-v2026-09-20`: searches `ceil(n / 25)` off
      `<entity>_ids`, reads `ceil(n / 5)` off `found`, natural-language
      search `5 + ceil(n / 25)`
- [x] 1.3 Settle `chargeOn` per route: six are
      `2xx_with_non_empty_result`, `POST /v1/people-search` is plain `2xx`,
      so its base is charged on an empty answer
- [x] 1.4 Verify there is no meter to read: the success envelope carries no
      billing field, and the response headers carry only
      `x-mira-request-id`, `x-trace-id` and (on a 429) `Retry-After`
- [x] 1.5 Verify refusals are real HTTP statuses, not 200-with-code: no key
      and a bad key both answer 401, an operator a field does not accept
      answers 400 `error_code: query_spec`
- [x] 1.6 Note the shape trap: `found` on the reads is an INTEGER count, not
      an array, so the settle reads it as a number
- [x] 1.7 Note the banded `total`: an exact integer below 100000, the string
      `"100000+"` at or above it
- [ ] 1.8 Drill measured latency, p50 and p95, on all seven endpoints
      including `size: 10000` and the model-backed search; move anything
      consistently above 60 s to the async lifecycle and set `timeouts` from
      the measured ceiling

## 2. Provider

- [x] 2.1 `provider.ts`: bearer auth, `https://mira-api.metix.ai` baseUrl,
      provisional 60 s timeouts, one `default` credit pool, three categories,
      and `meta.notes` carrying the two-call shape, the one-operator-per-leaf
      cross-field rule, the case-sensitive category values, the vocabulary's
      authority, and the rate limits
- [x] 2.2 Provider `usage.evidence`: `found` as a number on the reads, the
      length of the one present `<entity>_ids` array on the searches
- [x] 2.3 Write down why `usage.consolidate`, `output.fromError` and
      `output.fromResponse` are all absent, each with its evidence
- [x] 2.4 `schema/common.ts`: `zWhere` (opaque, grammar in the describe),
      `zSize`, `zAfter`, `zSourceSelection`

## 3. Endpoints

- [x] 3.1 `POST /v1/people/query` — `PER_UNIT` every 25, `size` required at
      the binding, strict mirror
- [x] 3.2 `POST /v1/jobs/query` — same shape, `jobs` category
- [x] 3.3 `POST /v1/companies/query` — same shape, `company-enrichment`
- [x] 3.4 `POST /v1/people-search` — `COMPOSITE`: flat base 5 AND the per-25
      line; only the metered component counted; the empty-answer charge
      stated in `meta.notes`
- [x] 3.5 `POST /entity/v1/profiles/detail-by-id` — `PER_UNIT` every 5, ID
      array untightened, mirror NOT strict
- [x] 3.6 `POST /entity/v1/jobs/detail-by-id` — same shape
- [x] 3.7 `POST /entity/v1/companies/detail-by-id` — same shape
- [x] 3.8 Every search description names its detail endpoint and the 100-ID
      cap
- [x] 3.9 Every `docsUrl` resolves

## 4. Fixtures

- [x] 4.1 Twelve provider-level chains: happy and empty for the people
      search, happy for jobs and companies search (with the banded total),
      happy and empty for the natural-language search, happy and none-found
      for the profile read, happy for the job read (5 of 6 found) and the
      company read (1 found)
- [x] 4.2 One shared 401 and one shared 400: all seven endpoints are POST and
      the url binds, so one chain each serves them all
- [ ] 4.3 Re-record with `deno task record` once
      `METIX_CREDENTIALS_API_KEY` exists, then hand-check for PII on top of
      what the recorder scrubs. The records are real people and this repo is
      public

## 5. Tests

- [x] 5.1 `provider.test.ts`: the seven ids, every doc POST and absolute-url,
      one pool, one interned auth fn, the three query estimates interned
      together, the block rates, the composite's two components, and only
      registry categories
- [x] 5.2 Per endpoint: happy with the settle asserted and billing fields
      asserted ABSENT from the output
- [x] 5.3 Empty and not-found cases asserting `credits: {}`
- [x] 5.4 Provider error (401) and query refusal (400) asserting
      `{credits: {}, evidence: {}}` and that `error_code` and `docs_url`
      survive
- [x] 5.5 A schema gate per endpoint: `size` required, strictness where the
      vendor declares it and absent where it does not, bounds, type refusals,
      and the `source` alias passing on the reads
- [x] 5.6 Live tests gated on `liveSkip("metix")`; the two read tests search
      first, because a read needs IDs a search returned

## 6. Hygiene

- [x] 6.1 `deno task check` clean
- [x] 6.2 `deno task lint` clean
- [x] 6.3 `deno fmt --check` clean
- [x] 6.4 `deno task test` green with no network, live tests ignored
- [x] 6.5 `deno task ids:check` lock updated with the seven new ids only
- [ ] 6.6 `deno task version:check` clean and double compile byte-identical
- [ ] 6.7 `deno task test:live` green against a real key

## 7. Follow-ups, out of scope here

- [ ] 7.1 A `metixSuite` in `scripts/drift/` polling `GET /contract`. Left out
      deliberately: a registered suite with no credential exits 2 rather than
      skipping, so it would red the weekly `drift.yml` until
      `METIX_CREDENTIALS_API_KEY` is a repo secret
- [ ] 7.2 The contact endpoints (`POST /v1/contact/probe`,
      `POST /v1/contact/unlock`). They are the vendor's only routes that
      report their own meter (`summary.charged_credits`), so they bring the
      first `usage.consolidate` with them, and a per-field composite whose
      estimate systematically overshoots because a field already unlocked
      within 30 days is returned again free
