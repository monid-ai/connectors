# Proposal: add-connector-metix

## Why

Metix AI is people, job and company data at a scale the catalog does not yet
cover from one vendor with one grammar: 900M profiles, 90M job postings and
30M companies, all searched with the same boolean query tree. The catalog has
people enrichment (pdl, apollo, contactout, clay, orbit, hunterio) and it has
company data, but it has no provider whose jobs dataset is a first-class
search surface beside its people and company datasets.

Two things make it a clean fit for the connector standard rather than a new
engine capability.

**The rate card is already machine-readable, and it reconciles.** Every route
in Metix's own `GET /contract` carries a `quota` block stating
`dynamicCost.formula` (the settle), `preflightMaxCost.formula` (the estimate),
`resultPath` (what to count) and a `priceVersion`. The models in this
connector are a transcription of that block at `usage-pricing-v2026-09-20`,
not an interpretation of prose. It was checked rather than assumed: a
76-call drill against production on 2026-10-10 predicted 2022 credits and the
measured `key_quota` delta was 2022, so the transcription is confirmed per
call and not just per formula. The same surface is what a drift suite would
poll, which makes Metix the second provider after apify with a published
surface a pricing guard can read.

**It is the clearest case yet of a two-call vendor.** Every search returns
encrypted string IDs and no record data; a second call turns up to 100 IDs
into records. No endpoint does both. The vendor names this the most common
integration mistake against its API, because code written as though one call
does both reads an empty payload and concludes the dataset is empty. That is a
`meta.description` problem, which is exactly where `discover` reads, so it is
worth stating plainly in every search doc rather than leaving an agent to
infer it.

It also surfaces one honest asymmetry worth naming rather than hiding: six of
the seven endpoints are free when they find nothing, and the seventh is not.

## What Changes

- **connectors/metix** — 7 synchronous endpoints against
  `https://mira-api.metix.ai`, bearer auth, one credit pool, no lifecycle.
  - 3 structured searches: `POST /v1/{people,jobs,companies}/query`.
  - 1 natural-language search: `POST /v1/people-search`.
  - 3 reads: `POST /entity/v1/{profiles,jobs,companies}/detail-by-id`.
- **The vocabulary is deliberately NOT mirrored.** `where` is an opaque
  object, as pdl's `zEsQuery` is. The live field list per dataset is
  `GET /contract` (`querySpecByEntity`: 44 fields on profile, 21 each on job
  and company, plus the operators each field accepts), and the vendor refuses
  an unknown name with HTTP 400 `error_code: query_spec` before anything is
  charged. Pinning that list in a compiled doc would drift the moment the
  vendor adds a field, and a stale pin rejects valid requests locally instead
  of letting the vendor answer. What the describes DO carry is the grammar,
  which is stable: three composers, eight operators, exactly one operator per
  leaf, and the same-record scopes.
- **Block-rate billing, two rates.** A search is `PER_UNIT` with `every: 25`
  over the IDs returned; a read is `PER_UNIT` with `every: 5` over the records
  found. Both draw 1 credit per block from the `default` pool.
- **One composite.** `POST /v1/people-search` is a flat `PER_CALL` base of 5
  AND the same per-25 line. Its quota block is `chargeOn: 2xx`, not
  `2xx_with_non_empty_result`: the base is drawn even when the answer is
  empty. Every other endpoint is free when it finds nothing. The connector
  models that honestly and says so in `meta.notes`, and the endpoint
  description points a caller at the structured search, which is both cheaper
  and free on a miss.
- **`size` REQUIRED at every search binding.** The vendor's default is 100 and
  its ceiling is 10000, which would make a pre-run estimate meaningless, so
  the caller states the cap (design D25). The mirrors stay faithful and
  optional; the tightening is derived at the binding.
- **Three hooks deliberately absent**, each for a verified reason rather than
  an omission:
  - No `usage.consolidate`. Metix reports no meter a fn can read: the success
    envelope carries the IDs, a `total` and a `next` cursor and no billing
    field, and the response headers carry only `x-mira-request-id` and
    `x-trace-id`. There is no claim to lift, so the derived fold settles every
    run, as it does for pdl, clay and tinyfish.
  - No `output.fromError`. Refusals are real HTTP statuses, and the body's
    `code` only mirrors the status line. The engine zero-bills every non-2xx
    envelope on its own.
  - No `output.fromResponse`. The `{code, msg, data}` envelope rides through
    untouched, which is what Metix's own MCP server does. Lifting `$.data` on
    success would cost a refusal its `error_code` and `docs_url`, the two
    fields the vendor designs for an agent to recover from a 4xx by fetching
    the named page as markdown, or else make the output shape depend on the
    status.
- **No new capability.** No schema change, no engine change, no new hook, no
  taxonomy change: `people-enrichment`, `company-enrichment` and `jobs` all
  already exist in `connectors/categories.ts`. Hence no `design.md`.

## Impact

- `connectors/metix/**` (new), `connectors/ids.lock.json` (+7 ids).
- Nothing else. The engine, the schema, the compiler and the category registry
  are untouched.

## Open items, stated rather than hidden

- **Timeouts are measured, not guessed.** Drilled against production on
  2026-10-10, serial, n=10 per endpoint plus n=3 at `size: 10000`. The
  slowest call of the whole drill was 11.64 s, so every endpoint stays sync
  and 60 s is a 5x margin over the worst case. The per-endpoint p50/p95 are
  in the provider comment. Nothing is near the line where an async lifecycle
  would be the right shape instead.
- **Fixtures are synthetic.** Shapes come from the live contract and one real
  2026-10-09 call; IDs and records are invented placeholders, because the
  records are real people and this repo is public. They will be re-recorded
  with `deno task record` once a key is in the environment, and the recorded
  set will be hand-checked for PII on top of what the recorder scrubs.
- **A drift suite is offered but NOT included here.** `GET /contract` is the
  surface a `metixSuite` in `scripts/drift/` would poll, which would make a
  Metix repricing fail in CI before it bills a buyer wrong. It is left out of
  this change on purpose: a registered suite with no credential in the
  environment exits 2 rather than skipping, so adding it before
  `METIX_CREDENTIALS_API_KEY` exists as a repo secret would turn the weekly
  `drift.yml` run red. Happy to follow up with it once the secret is in place.
- **`GET /contract` needs a key.** It costs no credits, but it is not
  anonymous, which is what a drift suite's credential read is for.
