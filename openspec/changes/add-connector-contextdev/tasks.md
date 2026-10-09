# Tasks: add-connector-contextdev

## 1. Decisions (owner, 2026-09-17)

- [x] 1.1 `brand/retrieve` = the vendor's current POST body, six keys (D2)
- [x] 1.2 Rate card = the current pricing page (screenshot 1, sitemap search
      +1) (D3)
- [x] 1.3 `/parse` and the deep-object GET params stay out; follow-ups (D6)
- [x] 1.4 Pool = Context.dev credits; `key_metadata.credits_consumed` is the
      claim (D3)

## 2. Provider

- [x] 2.1 `schema/common.ts`: `zPageUrl`, `zDomain`, `zDirectUrl`,
      `zCountry`, `zScrapeMaxAgeMs`, `zBrandMaxAgeMs`, `zWaitForMs`, `zZdr`,
      `zColorScheme`, `zTimeoutOpts`, `zPdfOptions`, `markdownOptionFields`
- [x] 2.2 `provider.ts`: meta + 2 shared notes, Bearer auth, baseUrl,
      timeouts (D8), credits pool, `usage.consolidate` (pluck
      `key_metadata`, claim `credits_consumed`, strip — D3),
      `output.fromError` without the envelope (D4)

## 3. Endpoints (19)

- [x] 3.1 `web-scrape-markdown` / `-html` / `-images` — PER_CALL 1
- [x] 3.2 `web-scrape-sitemap` — COMPOSITE: base 1 + request-keyed search
      surcharge 1 (D5)
- [x] 3.3 `web-crawl` — PER_UNIT·PAGE 1, `maxPages` required, evidence
      `metadata.numSucceeded`
- [x] 3.4 `web-search` — PER_UNIT·RESULT every 10, `numResults` required
- [x] 3.5 `web-extract` — PER_CALL 10
- [x] 3.6 `brand-retrieve` — PER_CALL 10, six-arm union body (D2, D7)
- [x] 3.7 `brand-search` — FREE, `fromResponse` strips `results[].logo` (D4)
- [x] 3.8 `utility-prefetch` — FREE, identifier union
- [x] 3.9 `people-enrich` — PER_UNIT·RESULT 20 per candidate, five-arm
      minimum-clue union (D7)
- [x] 3.10 `news-search` — PER_UNIT·RESULT every 10, `limit` required,
      entity union
- [x] 3.11 `web-naics` / `web-sic` — PER_CALL 10
- [x] 3.12 `web-screenshot` — PER_CALL 1 (D3), target union
- [x] 3.13 `web-fonts` — PER_CALL 5, target union
- [x] 3.14 `web-styleguide` — PER_CALL 10, target union
- [x] 3.15 `brand-ai-product` — PER_CALL 10; `brand-ai-products` — PER_CALL
      10, start union

## 4. Verify the shape

- [x] 4.1 `compiler:compile` twice — byte-identical; 19 docs; zero input
      fields without a description
- [x] 4.2 Compiled unions: `people/enrich` 5 arms, `brand/retrieve` 6 arms,
      `brand/ai/products` / `utility/prefetch` / `web/screenshot` 2 arms,
      each arm `additionalProperties: false`

## 5. Fixtures (synthetic)

- [x] 5.1 Per endpoint: `synthetic-happy` (the reference's response schema,
      `credits_consumed` = the fold) and `synthetic-provider-error` (the
      documented envelope); `synthetic-empty` on crawl / search / news,
      `synthetic-not-found` on people, `synthetic-searched` on sitemap

## 6. Tests

- [x] 6.1 `provider.test.ts`: literal rate table whose key set equals the
      nineteen ids; every happy run settles its row and drops
      `key_metadata`; no-envelope fold; provenance (one auth / consolidate /
      fromError, five own evidence fns, one fromResponse)
- [x] 6.2 Nineteen `endpoint.test.ts`: happy (usage deep-equal, output =
      body minus envelope), empty / not-found / searched where the model
      has a second outcome, provider error (digest without the balance on
      markdown), schema gates with passing near-twins, live gated on
      `CONTEXTDEV_API_KEY`
- [x] 6.3 Red once: see the PR body
- [x] 6.4 Verify: fmt · lint · check · test · double-compile · version:check

## 7. Follow-ups (not in this change)

- [ ] 7.1 With a Context.dev key: `deno task record` the happy and error
      chains and replace the `synthetic-*` files; confirm the `not_found`,
      empty-crawl and cached-brand (`credits_consumed: 0`) shapes
- [ ] 7.2 `/parse`: needs a raw-bytes request body in the engine (v1 relayed
      `file_url` → bytes server-side); 1 credit + 1 per OCR'd page on the
      current card
- [ ] 7.3 Deep-object GET params (`pdf`, `actions`, `enrichment`, `viewport`,
      `headers`, `timeoutOpts`, CSS selectors): needs a bracket / JSON query
      encoding — a `toRequest` per GET endpoint or an engine spelling — and
      the 2× / 5-credit lines that come with `actions` and `enrichment`
- [ ] 7.4 Scrape Bytes and Answers (new since v1): scope with the owner
