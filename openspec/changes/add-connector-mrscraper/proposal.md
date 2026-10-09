# Proposal: add-connector-mrscraper

## Why

MrScraper (mrscraper.com) is a live v1 monid-services provider: a
general-purpose scraping playground (any URL to HTML, Markdown, a
screenshot, or AI-extracted JSON; paginated listings; site maps) plus a
marketplace of fixed-price site scrapers (Google SERP and verticals,
AI-search answers, e-commerce product / review / search pages, travel
rates and fares, TikTok / YouTube media) — 88 v1 defs, 60 of
them live, 50 in scope after the 2026-09-17 site cull, behind one API token, billed in the vendor's own tokens.

It is the first connector whose vendor has TWO products on TWO hosts with
different auth, envelopes, and rates, and the first where a single wire
path (`POST https://api.mrscraper.com/`) fans out into seven endpoints
selected by query flags.

## What Changes

- **connectors/mrscraper** — 50 endpoints over a three-PR stack
  (CodeRabbit's 150-file limit): this change's part 1 is the provider,
  the category leaves, the seven playground presets (`scrape/{html,
  markdown, screenshot, extract, detail, listing, map}`), `serp/google`,
  the three AI-search scrapers, the two live Google verticals (flights,
  hotel) and the five media scrapers; part 2 adds the 18 live e-commerce
  scrapers; part 3 the 14 live travel scrapers.
- **The pool is MrScraper tokens** (owner decision 2026-09-17, design D3):
  every marketplace line pins v1's per-scraper token count; the playground
  lines are `PER_UNIT`·`TOKEN` at 1, settled by the vendor's `token_usage`.
- **Empty results and soft failures record zero** (owner decision, design
  D4): the vendor's `tokenUsage` echo is the claim only on a run with
  usable data; a 2xx with `success: false`, no `data`, an empty `data`, or
  `data.status: "FAIL"` claims nothing and counts 0 — v1's posture.
- **The caller gets the inner `data`** (owner decision, design D5): the
  marketplace envelope `{success, message, data, tokenUsage}` unwraps in a
  provider-level `fromResponse`; playground bodies keep their content and
  lose the vendor internals.
- **The playground is an endpoint-level override set** (design D2): its
  own host and `x-api-token` auth, a `toRequest` per preset that pins the
  query flags, lifts the option fields into the query string, forces
  `saveResult=false`, and pins the AI agent.
- **v1's URL allowlists compile as patterns** (design D6): a regex builder
  reproduces the registrable-label host rule and the optional path gate.
- **Synthetic fixtures**: the vendor's marketplace scrapers have no
  per-scraper reference online (dashboard only), so shapes follow v1's
  documented outputs and drills — no MrScraper key was available.

## Capabilities

- `mrscraper-connector`.

## Non-goals

- **Seven sites the owner culled on 2026-09-17** (Taobao — under
  maintenance; Coupang; Naver; Instagram; Skyscanner; Tokopedia — the
  company has folded; Shopee): ten live v1 defs stay out — `instagram/post`
  (this part), `taobao/product`, `coupang/{product,search,reviews}`,
  `naver/{product,search}`, `tokopedia/product`, `shopee/product` (part
  2), `skyscanner/flights` (part 3).

- **The 28 v1 defs pinned `enabled: false`** (aliexpress, bigw ×2, lowes,
  nordstrom/category, taobao/search, china-eastern, fruugo, mercadolibre
  ×2, agoda/flights, echemi ×2, everpro, stubhub ×2, google images /
  maps-search / maps-place / flight-detail, autozone product / fitment,
  walmart/reviews, expedia/reviews, hotels-com/rates, tiket/flights,
  trip/flights, alibaba/search): the vendor answered 500 / 504 / 400 / raw
  HTML on its own example inputs in v1's drills. The port carries only what
  v1 runs live.
- **Screenshots and oversized bodies stay inline** (owner decision, design
  D7): v1 saved the base64 JPEG and any body over 256 KB as workspace
  artifacts; this repo has no artifact channel, so the base64 string and
  the 3 MB Amazon body ride the output as the vendor sends them.
- **No `retry` / `tokenCap`, `cookies`, `proxy`, `action`, `recording`**
  on the playground: each upstream retry bills tokens; the rest are
  operator plumbing or vendor storage (v1 posture).
- **No V3 scraper management, results listing, analytics, proxy product,
  SERP async pair, or the PDP-cache GET cards** — v1's exclusions (shared
  vendor account, cross-tenant listings, or a 1-token HTML fetch sold at
  10-60×).
- **No live recordings.** Replace the `synthetic-*` fixtures with
  `deno task record` output once a key exists (tasks 7.1).

## Impact

New connector tree plus three category leaves (`ai-search`, `flights`,
`hotels`; the e-commerce leaves follow in part 2), all named as v1's
taxonomy manifest names them. Connector-only: no engine bump, no new
`Unit` (`TOKEN`, `RESULT` exist), no new preset (`presets.auth.header`
carries the playground's header), no hook-ABI change.
