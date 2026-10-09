# Design: add-connector-contextdev

Decision record for the Context.dev port. v1 source:
`monid-services/services/shared/providers/adaptors/contextdev/` (+
`openspec/changes/add-contextdev-provider/`, `add-contextdev-parse/`,
`add-contextdev-people-news-suite/`). Precedent: akta (sync GET +
queryParams with a provider-level `credits_consumed` claim), exa (sync POST
+ body); clay D13 for the unions; fundable for per-endpoint evidence where
the collection key differs.

## D1 — The provider is `contextdev`; ids derive from the wire path

v1's slug is `context.dev` (a dotted brand slug, the `censusdata.xyz`
convention). A provider name here must match `^[a-z0-9][a-z0-9-]*$` (the
folder is the name), so the connector is `contextdev` with
`displayName: "Context.dev"`. Every wire path is placeholder-free, so all
nineteen ids derive (`contextdev#web/scrape/markdown`,
`contextdev#brand/ai/products`); folders are the path with slashes turned
into hyphens.

## D2 — `brand/retrieve` is the vendor's current POST body (owner, 2026-09-17)

v1 authored `GET /brand/retrieve` with three query keys (domain / name /
ticker, exactly one) and a separate `GET /brand/transaction_identifier`.
The reference page now documents ONE `POST /brand/retrieve` whose body is
a `type`-discriminated one-of — `by_domain`, `by_name`, `by_email`,
`by_ticker`, `by_direct_url`, `by_transaction` (changelog: "The Brand
Intelligence APIs are now consolidated into POST /brand/retrieve"), and
the transaction-identifier reference URL serves that same document. The
owner chose the live shape. Consequences: the input is a six-arm union
(D7); a v1 caller changes its input; the standalone transaction endpoint
is the `by_transaction` arm, so v1's 21 defs become 19 endpoints (with
`/parse`, D6).

## D3 — Credits pool, current rate card, the meter as the claim (owner, 2026-09-17)

Context.dev meters one pool of API credits per organization and publishes
credits per endpoint (https://www.context.dev/pricing, 2026-09-17). Every
line pins that count; the $/credit of the plan (v1: $0.0009, the Pro
overage rate) is the broker's. Where the card moved since v1:

| endpoint | v1 | live card | v2 |
| --- | --- | --- | --- |
| screenshot | 5 | 1 / call | 1 |
| sitemap | 1 | 1, "2 credits with search" | base 1 + surcharge 1 when `search` is set |
| everything else | as live | unchanged | unchanged |

Every response — success or error — carries `key_metadata: {
credits_consumed, credits_remaining }`. The provider `consolidate` plucks
the envelope, claims `credits_consumed` when it is a number (a present 0 —
a cached brand lookup, a free search — prunes to an empty claim per D27
zero-pruning, so the doc's own derived fold settles instead: the list
rate on a metered doc, 0 on a free one — the engine-level shape of v1's
`max(calculated, actual)`), and returns
the body without the envelope: `credits_remaining` is OUR balance. The
fold is the cross-check, which is how a call billed above list (OCR'd PDF
pages in a crawl, search with inline Markdown, a paid-plan action) settles
at the real cost with a `usage.mismatch.derived` note.

## D4 — The balance is redacted on both paths: consolidate and fromError

v1 redacted `credits_remaining` at the transport boundary because error
bodies relay verbatim. Here the success path is covered by the consolidate
strip and the error path by `output.fromError`, which digests
`{message, error_code, key_metadata, request_id}` into `{message,
error_code?, raw}` with `key_metadata` omitted from `raw` — digest, never
hide, except the one field that is ours. `brand/search` additionally
strips `results[].logo` in an endpoint-level `output.fromResponse`: the
Logo Link URL embeds Monid's public client id and draws on a separate
quota (v1 `brandSearchFormatOutput`).

## D5 — Metered lines count what the vendor bills; evidence is per endpoint

- `web/crawl`: PER_UNIT·PAGE, evidence `metadata.numSucceeded` (failed and
  skipped pages are free), read strictly — the vendor marks it required
  and `results[]` also lists the failed pages; the hold is
  the caller-stated `maxPages` (required at the binding, D25).
- `web/search`, `news/search`: PER_UNIT·RESULT with `every: 10` — the
  card says "1 / ten_results" and v1's drills measured the block (9 → 1,
  19 → 2; 10 → 1, 30 → 3), so the fold's ceil is the vendor's arithmetic.
  Holds are `numResults` / `limit`, required at the binding.
- `people/enrich`: PER_UNIT·RESULT at 20 counted per candidate
  (`match.status === "candidate"`); the vendor's meter reports 0 on a
  `not_found` (v1 drill 2026-08-21).
- `web/scrape/sitemap`: COMPOSITE — flat `crawl` (1) plus a
  `search_surcharge` PER_UNIT·CREDIT line counted 1 when the REQUEST
  carries `search` (bytedance D4: rate lines follow the request).
- Everything else is flat PER_CALL or FREE with compiler-synthesized fns.

There is no provider-level generic evidence: the four metered
collections are named differently (`results`, `data`, `match`,
`metadata.numSucceeded`), so each endpoint states its own fn.

## D6 — What the engine cannot carry stays out (owner, 2026-09-17)

- `POST /parse` takes raw file bytes as the body; the engine sends JSON
  only. v1 relayed `file_url` → bytes server-side with an adaptor-local
  transport marker. Not ported; tasks 7.2.
- The GET endpoints spell their nested options as deep-object query params
  (`pdf[ocr]=true`, `enrichment[resolution]=true`, `viewport[width]=`,
  `headers[X]=`, `timeoutOpts[milliseconds]=`) or JSON-encoded arrays
  (`actions`, `includeSelectors`). The engine's query encoding is scalar
  or repeated key, so none is surfaced — v1's decision 9, unchanged. The
  POST endpoints carry `pdf`, `timeoutOpts`, selectors and the rest as
  body fields. Consequence: no GET can trigger the 2× actions or 5-credit
  enrichment lines; the claim reconciles if the vendor ever bills them.
- `tags` (request tagging) is not carried on any endpoint (v1 posture).
- v1's `timeoutMS` scalar no longer appears in the reference; the
  replacement `timeoutOpts` object is mirrored on the POSTs only.

## D7 — Vendor one-of rules bind as unions

v1 enforced seven cross-field rules with `.refine`, which compiles to
nothing here (until the `add-schema-refinement-hooks` proposal lands). Each is the vendor's own one-of, so it lives in the mirror
(`brand/retrieve` six arms, `news/search` entity four arms,
`utility/prefetch` identifier two arms, `brand/ai/products` two arms) or,
where the vendor declares every field optional, binds at the endpoint as
`.required()` arms: `web/screenshot`, `web/fonts`, `web/styleguide`
(domain | directUrl, each arm `.omit()`s the other — the vendor says "but
not both") and `people/enrich` (email | social_urls | name +
company | name + education | name + location — the vendor's stated
minimum-clue rule; its clues are additive, so its arms keep every field).
All compile to `anyOf` with `additionalProperties: false` per arm, so an
input naming two selectors where the vendor wants exactly one matches no
arm and fails the gate (surf D4). The unions carry no `.default()`
(contactout D7).

## D8 — Timeouts

Provider 60s / 60s (config.yml `context.dev`). The eight endpoints that
mirror `timeoutOpts` (brand retrieve, product, products, people enrich,
prefetch, crawl, extract, search) run at 310s: the vendor accepts a caller deadline
up to 300000 ms and bills a `return-partial` answer, so the transport must
outlive it (`provider.test.ts` asserts the relation). v1's overrides are
carried elsewhere: screenshot / styleguide 120s, scrape markdown `runMs`
300s.

## D9 — v1 ↔ live mirror differences

| field | v1 | live (2026-09-17) | v2 |
| --- | --- | --- | --- |
| scrape markdown `includeHTML` | absent | present | added |
| sitemap `includeSubdomains`, `search` | absent | present (`search` = 2 credits) | added; surcharge line |
| screenshot `clearPopups` | absent | present | added |
| screenshot `fullScreenshot` | boolean | string enum "true" / "false" | enum, as the vendor spells it |
| screenshot `waitForMs` | optional | default 3000 | optional (vendor default) |
| brand retrieve | GET, domain / name / ticker | POST, six typed arms | POST union (D2) |
| brand `by_ticker.ticker` | min 1 max 15 | pattern `^[A-Za-z0-9.]+$` | pattern |
| news `sourceCountry`, `articleLanguage` | 26- / 13-value enums | free strings (max 3) | `^[a-z]{2}$` patterns |
| news `cursor` | string ≤ 300 | string or null ≤ 300 | string ≤ 300 |
| `timeoutMS` on every endpoint | present | gone; `timeoutOpts` object | `timeoutOpts` on POSTs only (D6) |
| `country` | `length(2)` | 204-value `BrowserCountryCode` (html, markdown, crawl, screenshot); 239-value list on search | the vendor enums: shared `zCountry`, search keeps its own |
| URLs (`url`, `directUrl`, `sitemapUrl`, `social_urls`) | `z.url()` | `format: uri` | `pattern ^https?://\S+$` |
| emails (`by_email`, prefetch, people) | `z.email()` | `format: email` | a permissive email pattern |
| extract `maxAgeMs` default | 1 day | 7 days | described as 7 days |

## D10 — Synthetic fixtures

No Context.dev key was available. Every fixture is built from the response
schema embedded in the reference page's OpenAPI operation (public companies
and example.com as targets, placeholder ids and balances), with
`credits_consumed` set to the fold so the happy chains prove the claim and
the fold agree; the cached (0), above-list (2), not-found and searched cases
are their own chains or in-test edits. Replay matched the engine's URLs on
the first run for all nineteen endpoints; the wire form is self-consistent,
not live-verified (tasks 7.1).

## D11 — reconcile live verification (addendum, 2026-09-16)

All 19 endpoints ran live (tasks 7.1 partially discharged): every vendor
`credits_consumed` claim matched the derived fold with zero mismatch
signals. The two card divergences this change introduced are CONFIRMED:
`web/screenshot` bills 1 credit (v1's 5 was an older card — D3), and the
`web/scrape/sitemap` search surcharge is real (plain crawl claimed 1,
searched crawl claimed 2). people/enrich claimed 20 on a found person.
Synthetic fixtures remain to be replaced with recordings.
