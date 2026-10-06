# Tasks: add-connector-string

## 1. Drill the vendor surface

- [x] 1.1 Read the published request/response reference for `/search` and
      `/fetch` (fields, defaults, status codes); pin base url and auth
- [x] 1.2 Verify the pricing model: `/search` is a flat per-page rate;
      `/fetch` is one of four rates named by the response header
      `x-billed-request-type` — genuinely output-determined, not readable
      from the request
- [x] 1.3 Settle the open pricing question: which published plan tier to
      quote (String has no vendor-credits abstraction and no settle-time
      cost receipt) — resolved to the Growth tier throughout

## 2. Provider

- [x] 2.1 `provider.ts`: bearer auth, `/v1` baseUrl, timeouts, one credit
      pool labelled "US dollars (Growth-tier rate)"; no provider-level
      lifecycle

## 3. Endpoints (2)

- [x] 3.1 `search` — strict vendor-mirror body, `engine` defaulted to
      `google` at the binding, `PER_UNIT`·`PAGE` model, estimate/evidence
      keyed off `searchCount` and `paging.pages`
- [x] 3.2 `fetch` — strict vendor-mirror body (`jsonSchema` excluded, no
      published flat rate), single-tick `lifecycle.start` to capture
      `x-billed-request-type` off the raw response into `state.data`
      (the declarative `usage.evidence` path cannot see response headers),
      `COMPOSITE` of 4 `PER_UNIT`·`RESULT` components selected by that
      stashed value, estimate promises the cheaper proxy class on whichever
      strategy the request itself forces

## 4. Fixtures + tests

- [x] 4.1 Synthetic fixtures (`synthetic-` prefix) for both endpoints,
      built from the vendor's own published example bodies — no live key
      available while drafting; flagged in each fixture's `description`
      as needing a real `deno task record` capture before merge
- [x] 4.2 Per-endpoint replay tests: `search` (happy path, schema default),
      `fetch` (happy path per billed-type fixture including a non-default
      class, so the test proves the correct line is picked rather than
      always the cheap floor; schema-shape assertion that `jsonSchema`
      is absent); both with a provider-error case (zero usage) and a
      schema gate (rejected inputs plus a passing near-valid twin)
- [x] 4.3 Live tests for both endpoints, gated on `liveSkip("string")`
- [x] 4.4 Provider rate table (`provider.test.ts`): every compiled
      endpoint has a row, and every billed line consumes the published
      Growth-tier rate

## 5. Wiring + verification

- [x] 5.1 `fmt` · `lint` · `check` · `test` (`connectors/string/`: every
      replay test passes, live tests skip without a key) ·
      `compiler:compile` (both docs compile into the full catalog) — all
      green
- [x] 5.2 Full-repo `test` re-run after the `shared/testing/fixtures.ts`
      change, to confirm the widened `RECORDED_RES_HEADERS` allowlist
      doesn't affect any other connector's fixtures — green, no
      regressions
- [x] 5.3 Add the 2 ids to `connectors/ids.lock.json`
