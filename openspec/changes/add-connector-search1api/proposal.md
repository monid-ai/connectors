# Proposal: add-connector-search1api

## Why

[Search1API](https://s1.dev) is a live-web-data API — web search across 18
backends (incl. the Chinese engines), a dedicated news vertical, single-URL
page crawling to Markdown, sitemap link discovery, and trending topics —
priced in its own credits (1 credit per call; +1 per crawled page on
search/news "Deep Search" — https://s1.dev/pricing). Submitted by the
vendor (superagents-lab). It widens the web-search category with a
provider whose entire surface is already five simple synchronous POSTs.

## What Changes

- **connectors/search1api** — provider (`presets.auth.bearer()` on
  `https://api.search1api.com`) + 5 endpoints: `search`, `news`, `crawl`,
  `sitemap`, `trending`. `crawl` is leaf `PER_CALL` at 1 credit;
  `sitemap`/`trending` are leaf `PER_UNIT` at 1 credit, counted 1 only
  when the response's `links`/`results` is non-empty; `search` and
  `news` are COMPOSITE — 1 credit for a call that returns results plus
  1 credit per successfully crawled page when `crawl_results > 0`
  (the vendor's "Deep Search" line on https://s1.dev/pricing). An empty
  result list bills the buyer nothing (Monid absorbs the vendor's
  credit). Request bodies are `.strict()` — unknown keys are rejected,
  matching the OpenAPI `additionalProperties: false`. Provider-
  level `output.fromError` normalizes the vendor's `{detail}` /
  RFC-9457 problem envelopes.
- **Shared schema** — `schema/common.ts` mirrors the fields `/search` and
  `/news` share (query, engines, max_results, crawl_results, image,
  include/exclude_sites, language, time_range), including the vendor's
  `""` enum entries (the documented "default backend" spelling).
- **Provider-level fixture chains** — one recorded happy path per endpoint
  plus a recorded 401 envelope; `{{request.url}}` bindings.
- **openspec/changes/add-connector-search1api** — this proposal; no
  `design.md` (no schema/engine contract change, no new Units).

## Capabilities

- `search1api-connector`.

## Non-goals

- The **batch array** variants of `/search`, `/news`, `/crawl` (one credit
  per item — same verb repeated).
- `/screenshot` (binary image payload), `/extract` (prompted structured
  extraction), `/deepcrawl` (async multi-page job — the lifecycle surface
  when there is a concrete need), `/usage` + `/health` (account plumbing,
  not agent capability).

## Impact

New connector tree only; no schema/engine/compiler changes — version
stays.
