# Proposal: add-connector-litescrape

## Why

Litescrape (litescrape.com) is the v1 monid-services provider of MR !310
(MON-282, branch `feat/add-litescrape-provider`, 2026-09-18): live
search-engine and marketplace results as JSON — Google Search, AI
Overview, AI Mode, Ads, Local, Shopping, and Maps (places, reviews,
posts, foot traffic, photo metadata), Bing and DuckDuckGo search and
maps, Apple Maps places and reviews, Yelp and Tripadvisor search, places,
and reviews, and Google Play and Apple App Store listings, products, and
reviews. One host, one Bearer key, one flat price ($0.15 per 1,000
calls), every endpoint a synchronous GET. It is the catalog's first
app-store source and the cheapest SERP / Maps / reviews surface on the
market.

v1 wrote 34 defs; the vendor has since removed one route (see
Non-goals), so 33 ship.

## What Changes

- **connectors/litescrape** — 33 endpoints whose ids are the vendor's
  own `<engine>/<kind>` paths (design D1): 13 Google (`google/search`,
  `google/ai-overview`, `google/ai-mode`, `google/ads`, `google/local`,
  `google/shopping`, `google/shopping/product`, `google/maps`,
  `google/maps/popular-times`, `google/maps/posts`,
  `google/maps/photo-meta`, `google/reviews`,
  `google/contributor-reviews`), 6 Google Play (`google/play/{apps,
  games, books, movies, product, reviews}`), 3 App Store
  (`apple/app-store/{search, product, reviews}`), 2 Apple Maps
  (`apple/maps/{places, reviews}`), 2 Bing, 2 DuckDuckGo, 2 Yelp, 3
  Tripadvisor.
- **The pool is Litescrape credits, one per call** (owner decision
  2026-09-20, design D2): the vendor's prepaid balance is counted in
  calls it names credits; the $0.15 per 1,000 conversion is the
  broker's, not the doc's. No response carries a meter, so there is no
  `consolidate`; the tests hold the 33 draws as literals.
- **An empty success records 0** (owner decision 2026-09-20, design
  D3): the vendor deducts one credit on every HTTP 200, including a
  review page past the end, `popular_times: null`, and a listing without
  posts (v1 drill), and v1 chose to absorb those. Each endpoint's line
  is PER_UNIT·RESULT with its own 0|1 evidence over v1's
  `RESULT_GROUPS`; the provider promises one call.
- **The vendor's follow-up links are relayed verbatim** (owner decision
  2026-09-20, design D5): v1 rewrote every `api.litescrape.com/api/...`
  link into `{ endpoint, queryParams }` by consulting the catalog; a
  hook fn cannot, so a provider note states the mapping instead. No
  `fromResponse`.
- **v1's cross-field `superRefine` rules compile as unions or notes**
  (design D7): seven "at least / exactly one" rules are `anyOf` arms,
  everything else rides `meta.notes` and the vendor's 400.
- **Three query fields the live docs added after v1** (`oq`, `gs_lp`,
  `sclient` on Google Search and AI Overview) enter the mirror; Google
  Local's `start` takes the vendor's 10,000 bound (design D9).
- **A new taxonomy leaf `app-stores`** in `connectors/categories.ts`
  (v1's manifest leaf, same name and description).
- **Synthetic fixtures** (design D10): shapes follow the vendor's
  reference page and v1's drill bodies; no Litescrape key was available.

## Capabilities

- `litescrape-connector`.

## Non-goals

- **`/google/maps/web`** (v1 `GOOGLE_MAPS_WEB_ENDPOINT`, Alpha) — the
  route no longer exists upstream: `GET /api/google/maps/web` answers
  404 `route_not_found` and its docs page is gone (probed 2026-09-20;
  v1 captured it from the docs on 2026-09-16). Porting a dead route
  would ship a doc every run of which is a provider error.
- **`GET /api/keys/status`** — the balance probe (reports Monid's own
  balance), a hosted concern (v1 D10).
- **The SDK-only durable batch pair** (`POST /api/<path>/async` +
  `GET /api/batch/jobs/{id}`) — the same data as the sync call with 24 h
  retention; v1 did not expose it either.
- **The 256 KB output-overflow artifact** (v1 `getArtifactDirectives`) —
  the engine has no byte / artifact channel; a Play games browse page
  measured 568 KB in v1's drill and is returned inline (the mrscraper D7
  posture).
- **v1's `exactIntegerReviver`** (ids past 2^53 kept as digit strings) —
  the engine's output is JSON as JS numbers; every large id (Apple
  `muid`, Shopping `gpcid` / docids, contributor ids) arrived as a JSON
  string in all 45 of v1's drill bodies, so nothing is lost today
  (design D8).

## Impact

- New: `connectors/litescrape/**` (provider, 6 shared schema files, 33
  endpoints, 51 fixtures, one provider-level suite, `test-inputs.json`),
  `connectors/categories.ts` (+1 leaf), this change.
- No schema / engine contract change; `ENGINE_VERSION` untouched.
