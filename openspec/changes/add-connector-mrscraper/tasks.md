# Tasks: add-connector-mrscraper

## 1. Decisions (owner, 2026-09-17)

- [x] 1.1 Pool = MrScraper tokens; marketplace amounts = v1's counts;
      playground = the vendor's meter (D3)
- [x] 1.2 Empty results and soft failures record zero, as v1 (D4)
- [x] 1.3 Output = the inner `data`, as v1 (D5)
- [x] 1.4 Screenshot base64 and oversized bodies stay inline (D7)

## 2. Provider (part 1)

- [x] 2.1 `schema/common.ts`: `siteUrl` pattern builder (D6),
      `urlOnlyBody`, `zAnyPageUrl`, `zPrompt`, `playgroundOptionFields`,
      `zSearchCountry`, `zQuestion`
- [x] 2.2 `provider.ts`: meta + 2 shared notes, Bearer auth, the sync host,
      timeouts (D8), tokens pool, usable-only `consolidate` (D3/D4),
      generic 0|1 `evidence` (D4), `fromResponse` unwrap (D5)
- [x] 2.3 `categories.ts`: `ai-search`, `flights`, `hotels`

## 3. Endpoints, part 1 (18)

- [x] 3.1 Playground `scrape-html` / `-markdown` / `-screenshot` /
      `-extract` / `-detail` / `-listing` / `-map` — pinned v1 ids, the
      playground host and header auth, per-preset `toRequest` (D2),
      PER_UNIT·TOKEN with v1's holds (20 / 20 / 20 / 50 / 50 / 30+20×pages
      / 30+20×pages), `token_usage` evidence + consolidate, internals strip
- [x] 3.2 `serp-google` — 1 token, `format: "json"` pinned by `toRequest`
- [x] 3.3 `gemini-ask` 10, `google-ai-mode` 10, `gpt-web-search` 25
- [x] 3.4 `google-flights` 10 (round-trip union), `google-hotel` 10 (URL gate)
- [x] 3.5 `tiktok-hashtag`, `tiktok-video-download`,
      `tiktok-video` (330 s), `youtube-comments` (330 s), `youtube-video`
      (330 s) — 10 each

## 4. Endpoints, part 2 (18 e-commerce)

- [x] 4.1 `1688-category` 29, `amazon-product` 50, `autozone-category` 12,
      `cvs-product` 10, `homedepot-product` 10, `kroger-product` 10,
      `lazada-category` 10, `lazada-product` 10, `meijer-product` 10,
      `nordstrom-product` 93, `segari-product` 24, `shein-product` 30,
      `tiktok-catalog` 36, `tiktok-product` 12, `tiktok-search` 20,
      `walmart-product` 10, `watsons-category` 21, `zepto-product` 9 —
      pinned v1 ids, site gates with the marker-anywhere path rule (D6),
      `zZipCode` / `zLazadaUrl` in `schema/common.ts`, Shein's `render`
      bound to the vendor default (D11), the 330 s overrides on cvs,
      homedepot, kroger, lazada/category, meijer (D8)
- [x] 4.2 `categories.ts`: the fourteen e-commerce leaves (tiktok-shop,
      1688, autozone, cvs, homedepot, kroger, lazada, meijer, nordstrom,
      segari, shein, walmart, watsons, zepto) as v1's taxonomy names them
- [x] 4.3 Verify: the rate table grows to 36 rows; eighteen
      `endpoint.test.ts` (happy, provider error, gate + twin, live);
      Shein's binding default pinned; fmt · lint · check · test ·
      double-compile · version:check; red once

## 5. Endpoints, part 3 (14 travel)

- [x] 5.1 `agoda-hotel` 10, `agoda-rates` 46, `agoda-reviews` 41,
      `booking-rates` 41, `booking-reviews` 36, `china-southern-flights` 2,
      `expedia-rates` 31, `expedia-search` 26, `hotels-com-reviews` 24,
      `tiket-hotel` 10, `trip-hotel` 20, `trip-rates` 30, `trip-reviews`
      31, `tripadvisor-reviews` 20 — pinned v1 ids; TripAdvisor on the
      `tvlk` host (D12); the three review scrapers' empty-`reviews[]`
      basis in their own evidence + consolidate (D12); the 330 s
      overrides on hotels-com/reviews and trip/reviews (D8)
- [x] 5.2 `schema/common.ts`: `zBookingUrl`, `zExpediaUrl`, `zTripUrl`,
      `zIsoDate`, `zIataCode`, `zGuestCounts`, `zCurrency`, `zLocale`,
      `zLoginFlag` (two or more users each); `google-flights` now reads
      `zIsoDate` / `zIataCode` from there (compiled doc byte-identical)
- [x] 5.3 Verify: the rate table grows to 50 rows; the provenance test
      pins the review trio's own interned fns and the TVLK URL; fourteen
      `endpoint.test.ts` (happy, provider error, gate + twin, live; the
      trio also no-reviews = 0); fmt · lint · check · test ·
      double-compile · version:check; red once

## 6. Verify (part 1)

- [x] 6.1 `compiler:compile` twice — byte-identical; 18 docs; zero input
      fields without a description
- [x] 6.2 `provider.test.ts`: literal rate table whose key set equals the
      ids; every happy run settles its row and drops the meter; six
      empty / soft-failure shapes record zero; above-card claim wins with
      a mismatch; no-meter envelope settles the card; provenance (the
      marketplace inherits the provider's four fns, the playground's seven
      override with interned texts and seven `toRequest`s)
- [x] 6.3 Eighteen `endpoint.test.ts`: happy, provider error, schema gates
      with passing near-twins, live gated on `MRSCRAPER_API_KEY`; the
      playground HTML and screenshot presets pin where lifted options land
      in the wire URL; the hotel scraper pins the soft-failure zero
- [x] 6.4 Red once: see the PR body
- [x] 6.5 Verify: fmt · lint · check · test · double-compile · version:check

## 7. Follow-ups (not in this change)

- [ ] 7.1 With a MrScraper key: `deno task record` the happy and error
      chains and replace the `synthetic-*` files; re-confirm the playground
      body shape (`token_usage`, internals) and the marketplace envelope
- [ ] 7.2 v1 left two in-scope live defs that answered 404 / 401 upstream
      in its spot checks (`tiktok/search`, `tripadvisor/reviews`): they
      ship in parts 2 / 3 as v1 runs them; drop them if a live run still
      fails
- [ ] 7.3 An artifact channel for the screenshot JPEG and oversized bodies
      (D7) once the engine has one
- [ ] 7.4 The playground's `retry` + `tokenCap` pair, if a bounded retry is
      wanted (each attempt bills)
