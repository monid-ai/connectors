# Tasks: add-connectors-tinyfish-akta-octen

## 1. Foundation

- [x] 1.1 Branch `add-connectors-tinyfish-akta-octen`; auth mechanics
      verified against the v1 requester code (X-API-Key / x-api-key ×2)
- [x] 1.2 categories.ts: news-search, company-enrichment, company-news,
      company-reviews, funding-data, embeddings
- [x] 1.3 Compiler fix + test: baseUrl path prefixes survive resolution
      (concatenation — akta's /api exposed the URL-resolve prefix drop)
- [x] 1.4 exa golden updated for whole-repo compilation (membership
      inclusion, not equality)

## 2. tinyfish

- [x] 2.1 provider.ts (X-API-Key; provider-level perCall; NO provider
      baseUrl) + search/fetch defs with per-endpoint hosts
- [x] 2.2 Schemas ported (superRefine rules → documented describes; D6)
- [x] 2.3 Synthetic fixtures + tests (host assertions, free usage,
      provider-error, shared settle fn; live gated)

## 3. akta

- [x] 3.1 provider.ts: generic array→CSV toRequest + credit-native settle fn
      (units = credits, cost = credits/20 dollars, field absorbed)
- [x] 3.2 Six minimal endpoint defs + ported schemas (shared
      schema/common.ts: zCompany/zDate/zSection/zNewsScore/zSentiment)
- [x] 3.3 Synthetic fixtures + tests (credit math incl. free lookup at 0,
      CSV wire shape, one-fn-each interning across six docs; live gated)

## 4. octen

- [x] 4.1 provider.ts (live surface only — D1) + search/broad-search/
      extract/embedding defs with per-endpoint receipt-driven settle fns
- [x] 4.2 Schemas ported (shared search-options.ts; strict ⇒ stream rejected
      by input validation)
- [x] 4.3 Synthetic fixtures + tests (call+token tier, successful-urls-only
      billing, token metering, meter absorption; live gated)

## 5. Wiring + docs

- [x] 5.1 GitHub Actions removed for now (verification runs via deno
      tasks; CI returns as its own change)
- [x] 5.2 README connector list
- [x] 5.3 Verify: fmt · lint · check · full suite · determinism · catalog
      smoke · version:check · openspec validate
- [x] 5.4 Replace synthetic fixtures via `deno task record` when vendor keys
      exist — DONE for akta (all 6 + real 401 + empty) and octen (all 4 +
      real 401 + zero-successful-urls empty); live suite green for both.
      Port fixes surfaced by real traffic: akta paths need a TRAILING SLASH
      (vendor 307-redirects the bare form; the engine transport is
      redirect: "manual"), and octen nests payloads under a `data` envelope.
      tinyfish stays synthetic (no key yet)
