# Proposal: add-connectors-tinyfish-akta-octen

## Why

The connector standard (define-endpoint-doc-and-engine) shipped with one
reference connector. Three more — ported from their proven v1 monid-services
adaptors — grow the catalog and exercise corners of the standard exa never
touched: per-endpoint baseUrl overrides on a multi-host provider,
provider-level hook/usage fallback shared by every endpoint, array→CSV query
serialization, credit-native billing with derived vendor cost, and
receipt-driven native-unit metering.

## What Changes

- **connectors/tinyfish** — 2 free endpoints (`search` GET on the search
  host, `fetch` POST on the fetch host); `X-API-Key`; provider-level
  `perCall` usage; first real use of per-endpoint `request.baseUrl`.
- **connectors/akta** — 6 GET endpoints (company-search, company-enrichment,
  news, industry-search, product-reviews, employee-reviews); `x-api-key`;
  ONE provider-level array→CSV `toRequest` and ONE credit-native settle fn
  (`credits_consumed` → credit units + derived dollars) inherited by all six.
- **connectors/octen** — the 4 endpoints v1 had ENABLED (search,
  broad-search, extract, embedding); `x-api-key`; per-endpoint native-unit
  settle fns reading the `meta.usage.*` receipt.
- **connectors/categories.ts** — new leaves: news-search,
  company-enrichment, company-news, company-reviews, funding-data,
  embeddings.
- **Compiler fix** (port-discovered): baseUrl PATH PREFIXES survive url
  resolution (concatenation instead of `new URL(path, base)` — akta's
  `https://api.akta.pro/api` exposed the prefix-dropping bug).
- Synthetic fixtures until real keys allow `deno task record`. (GitHub
  Actions removed for now — the verification suite runs via deno tasks;
  CI returns as its own change.)

## Capabilities

- `tinyfish-connector`, `akta-connector`, `octen-connector`.

## Non-goals

Octen's 7 v1-disabled endpoints (answer, chat-completions, messages,
images-generations, vl-embedding, image-search, video-search) — disabled
there for $0-pricing/beta/admissibility reasons that porting would
reintroduce; they arrive with the pricing pass as their own change. Akta
balance probing. TinyFish Agent/Browser APIs.

## Impact

New connector trees + registry leaves + one compiler fix; no schema/engine
contract changes (no new Units needed — the version stays 0.1.0).
