# Proposal: add-connector-contextdev

## Why

Context.dev (context.dev) is a live v1 monid-services provider (slug
`context.dev`): the unified web-context API — scrape a URL to Markdown or
HTML, crawl a site, search the web, extract schema-shaped JSON, enumerate
sitemaps and images, capture screenshots, search company news, enrich
people, and resolve brand, industry (NAICS/SIC), product and design-system
intelligence — behind one Bearer key, billed in credits at published
per-endpoint rates.

It is the first connector whose vendor reports its own meter on EVERY
response, error bodies included (`key_metadata.credits_consumed`), next to
a field that must never reach a caller (`credits_remaining`, our account
balance) — so the claim, the strip, and the error digest are one provider
story.

## What Changes

- **connectors/contextdev** — 19 synchronous endpoints: the scrape family
  (`web/scrape/{markdown,html,images,sitemap}`, `web/screenshot`),
  `web/crawl`, `web/search`, `web/extract`, the brand family
  (`brand/retrieve`, `brand/search`, `utility/prefetch`), `people/enrich`,
  `news/search`, `web/naics`, `web/sic`, `web/fonts`, `web/styleguide`,
  `brand/ai/product`, `brand/ai/products`; all sharing the provider's Bearer
  auth, base URL, timeouts, credit pool, `usage.consolidate` and
  `output.fromError`.
- **The pool is Context.dev credits at the current rate card** (owner
  decision 2026-09-17, design D3): every line pins the published credit
  count; the provider `consolidate` claims `key_metadata.credits_consumed`
  and strips the envelope; the fold is the cross-check.
- **`brand/retrieve` is the vendor's current POST** (owner decision, design
  D2): one discriminated body with six lookup keys (domain, name, email,
  ticker, transaction descriptor, direct URL). v1's `GET /brand/retrieve`
  three-key form and its separate `GET /brand/transaction_identifier` fold
  into it — the vendor consolidated them, and the transaction page now
  serves the same document.
- **Metered lines count what the vendor bills** (design D5): crawl per page
  succeeded, search and news per block of ten results (`every: 10`), people
  per candidate found, sitemap plus a request-keyed search surcharge.
- **Vendor one-of rules compile as unions** (design D7): brand lookup keys,
  news entity, prefetch identifier, products start, screenshot / fonts /
  styleguide target, and people's minimum-clue rule — v1's `.refine`s.
- **Synthetic fixtures**: shapes from the OpenAPI operations embedded in
  the reference pages — no Context.dev key was available for this port.

## Capabilities

- `contextdev-connector`.

## Non-goals

- **No `/parse`** (owner decision, design D6): its request body is raw file
  bytes and the engine sends JSON only.
- **No deep-object GET params** (owner decision, design D6): browser
  `actions`, `pdf`, image `enrichment`, `viewport`, `headers`,
  `includeSelectors` / `excludeSelectors` and `timeoutOpts` on the GET
  endpoints spell as `pdf[ocr]=true` on the wire, which the engine cannot
  send. v1 excluded the same set. The POST endpoints carry their nested
  options.
- **No `tags`** (request tagging): operator plumbing, not a data purchase;
  v1 excluded it.
- **No browser `actions` on `web/extract`** either, for parity with v1's
  "no def can trigger the actions multiplier".
- **No Scrape Bytes, Answers, Batches, Monitors, WebDBs, Logs or Webhooks**
  — surfaces v1 never carried (stateful resources, webhook delivery, or
  launched after v1's scope was locked).
- **No live recordings.** Replace the `synthetic-*` fixtures with
  `deno task record` output once a key exists (tasks 7.1).

## Impact

New connector tree only. Connector-only: no engine bump, no new `Unit`
(`PAGE`, `RESULT`, `CREDIT` exist), no new preset, no hook-ABI change, no new
category leaf (`web-extraction`, `web-search`, `company-enrichment`,
`company-news`, `people-enrichment` exist).
