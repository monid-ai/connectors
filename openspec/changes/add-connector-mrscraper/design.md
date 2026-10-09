# Design: add-connector-mrscraper

Decision record for the MrScraper port. v1 source:
`monid-services/services/shared/providers/adaptors/mrscraper/` (+
`openspec/changes/add-mrscraper-provider/`,
`extend-mrscraper-marketplace/`). Precedents: exa (sync POST + body);
tinyfish (multi-host via endpoint `request.baseUrl`); suzanne D3 (the
provider declares the majority, the minority overrides); akta (a
provider-level vendor-meter claim); clay D13 (unions); bytedance (a pinned
field injected by `toRequest`).

## D1 — Ids are v1's; every marketplace path is transport

The marketplace wire paths are the vendor's versioned transport
(`/api/google/serp/v2/sync`, `/api/sns/tiktok/video/sync`) and the
playground's is `/` for seven presets, so every endpoint pins v1's
published id (`/scrape/html`, `/serp/google`, `/tiktok/video`) — the
minimax posture. Folders are the id with the slash turned into a hyphen.

## D2 — The playground is an endpoint-level override set

Two products share the token: the marketplace (the majority — 43 of 50
endpoints — on `sync.scraper.mrscraper.com`, Bearer, the `{success,
message, data, tokenUsage}` envelope, a fixed price each) and the
playground (7 presets over ONE `POST https://api.mrscraper.com/`,
`x-api-token`, a flat body with `token_usage`, a variable price). The
provider declares the marketplace; each playground endpoint overrides
`request.baseUrl`, `auth.inject` (`presets.auth.header("x-api-token")`;
v1 also sent the token as a `token` query param, which the vendor's auth
page does not require and which would put the credential in URLs and
logs — dropped), `timeouts` (330 s), `input.toRequest`, `usage.model` /
`estimate` / `evidence` / `consolidate`, and `output.fromResponse`. The
identical texts intern to one fnTable entry each; only the seven
`toRequest`s differ (their flags).

`toRequest` is where v1's `playgroundStart` went: the preset's query flags
(`html=true`, `markdown=true`, `browserRendering=true&screenshot=full`),
`saveResult=false` (a playground run otherwise persists the target URL and
result in the vendor account's shared Results store — v1 drill-verified),
the option fields lifted from the body into the query string the upstream
reads them from, and the AI agent pinned in the body (`general`, `detail`,
`listing`, `map`) so a caller cannot select another preset's agent at
this preset's hold. The lifted options spread AFTER the flags, so a
caller's `screenshot: "top"` overrides the screenshot preset's `full`.

The SERP scraper pins `format: "json"` the same way (the vendor's default
flipped to `html`, the raw results page, on 2026-09-02 — v1
`syncPostStart`); Shein's `render` (part 2) is a binding default instead,
because it is a documented, caller-visible field.

## D3 — The pool is MrScraper tokens; the vendor's echo is the claim (owner, 2026-09-17)

The vendor meters everything in plan tokens: a marketplace scraper draws
its fixed catalog count per run (the marketplace `pricePerRun`, dumped by
v1 on 2026-09-07 and corrected by v1's 2026-09-08 drills where the card
was wrong — naver 10, agoda/reviews 41, tokopedia 5, autozone/product 9,
china-southern 2, media downloads 10), echoed as `tokenUsage`; the
playground draws 1 token per 30 s of runtime + 1 per 0.25 MB of
bandwidth (+ a 5-token trace and AI tokens for the agents), echoed as
`token_usage` (docs.mrscraper.com/docs/getting-started/api-token,
2026-09-17). So the pool is that token: every marketplace line pins its
count as `consumes.amount`, and every playground line is `PER_UNIT`·
`TOKEN` at 1 with v1's drill-informed holds (20 for the flat presets, 50
for the AI presets, `30 + 20 × pages` for listing and map — 3 pages when
the caller states none, capped at 20 by the schema).

v1's user price (`tokens × $0.001`, the public overage rate) and its comped
vendor account (`unitPrice` $0) are the broker's concern: the doc states
the vendor's card in the vendor's unit.

The echo is the CLAIM — plucked (read + strip) by the provider consolidate
(`$.tokenUsage`) and by the playground override (`$.token_usage`), omitted
when absent (never `?? 0`; an envelope without the meter settles the
card). Where the vendor bills above the card (a Super-mode run, an AI
extraction that reads more), the claim wins with a `mismatch` note.

## D4 — Empty results and soft failures record zero (owner, 2026-09-17)

The vendor bills its full price for a 2xx that carries nothing usable —
`data: null` on Naver, `reviews: []` on Agoda (v1 drill 2026-09-08), and
the "soft failure" `data.status: "FAIL"` ("Could not extract ASIN" on a
wrong-site Amazon URL, 50 tokens). v1 recorded 0 for all of these because
the account is comped, and the owner kept that posture. Two things follow:

- the marketplace lines are `PER_UNIT`·`RESULT` counted 0 | 1, not
  `PER_CALL` (which bills every 2xx);
- the provider consolidate claims `tokenUsage` ONLY on a usable body, so
  the derived fold (0) settles the empty run. The usable rule is v1's
  `isEmptyMarketplaceResult`: `success !== false`, `data` present and not
  null, a non-empty array or a non-empty object without `status: "FAIL"`.
  It is stated verbatim in the consolidate and the evidence (closed terms
  cannot share it). The review scrapers (part 3) override both with the
  extra `reviews: []` test.

Consequence, eyes open: the vendor's ledger and ours diverge on those
runs by design; the doc records what the broker charges the caller, as
v1 did, not what the vendor drew.

## D5 — The caller gets the inner data (owner, 2026-09-17)

v1 unwrapped the marketplace envelope to `data` and stripped the
playground internals. Both are provider-level `fromResponse`s here: the
marketplace unwrap on the provider (a body without a `data` key passes
through — a few scrapers answer bespoke shapes), and the playground strip
(`residential_proxy_usage`, `data_path`, `html_path`,
`listen_network_data` — the proxy meter and paths inside the vendor's own
storage) as the playground endpoints' override; the meters are already
gone by then (the consolidate plucked them). Cost, stated: the
envelope's `message` (the vendor's own wording of a soft failure) is not
returned; the soft failure itself is visible as `data.status: "FAIL"`.

## D6 — v1's URL allowlists compile as patterns

v1 gated every marketplace `url` with a `superRefine` (a wrong-site URL
is a billed vendor run). `schema/common.ts`'s `siteUrl` builds the same
rule as a regex: the host must end in `<brand>.<tld>` or `<brand>.<co|com|
ac|edu|gov|net|org>.<tld>` — the registrable label, so
`amazon.attacker.example` fails — with any subdomains before it, a
case-insensitive brand, and an optional `pathPattern` (a regex source
matched from the first `/` after the host) only where the site's URL
shape is unambiguous. v1 tested its path regex against the whole
pathname, so a marker may sit after other segments (`amazon.com/Some-
Slug/dp/B0…`, `watsons.com.my/health-care/vitamins-minerals/c/110100`):
the e-commerce gates prefix the marker with `(?:/[^?#]*)?` (part 2); the
part-1 gates that anchor at the host stay as they are. The travel gates
(part 3) are host-only, as v1's were.

## D11 — Shein's `render` is a binding default (part 2)

The Shein marketplace card marks `render` required; v1 supplied
`render: false` in a def-owned start when the caller omitted it. Here it
is the documented, caller-visible knob it is: the mirror keeps it
optional with the vendor's default in the describe, and the binding
materializes `.default(false)` so the wire always carries it (D24 —
`.default()` materializes). Unlike the SERP `format` (D2), a caller may
choose the other value. `tiktok/product`'s `render` has no vendor
default on the card, so it stays optional and off the wire when omitted
(v1 posture).

The four ZIP-code scrapers (cvs, homedepot, kroger, meijer) share
`zZipCode` and the two Lazada scrapers share `zLazadaUrl` in
`schema/common.ts` (two or more users); Walmart's `zipCode` keeps its
own describe (v1's wording differs) in its own inputs.

## D12 — The review scrapers count zero on `reviews: []`; TripAdvisor's host (part 3)

v1 gave `agoda/reviews`, `trip/reviews`, and `tripadvisor/reviews` a
second emptiness predicate (`hasNoReviews`): a page with no reviews
answers `{url, total_reviews: 0, reviews: []}` — a non-empty object the
provider rule counts as usable — and the vendor bills its full card for
it (41 tokens, Agoda, 2026-09-08 drill). Those three endpoints override
`usage.evidence` and `usage.consolidate` with the provider's rule PLUS
that check, stated verbatim (closed terms cannot import the provider's
predicate); the identical texts intern to one fnTable entry each, and
the provenance test pins that the trio share them and nobody else does.
`booking/reviews` and `hotels-com/reviews` had no such predicate in v1
(their bodies are not documented in that shape) and inherit the
provider's rule.

`tripadvisor/reviews` posts to the vendor-designated
`https://tvlk.mrscraper.com` (v1 `MRSCRAPER_TVLK_BASE_URL`): an
endpoint-level `request.baseUrl`, the tinyfish posture, with the
provider's Bearer inject and unwrap unchanged; its evidence and
consolidate are the review trio's (above), not the provider's.

## D7 — Screenshots and oversized bodies stay inline (owner, 2026-09-17)

v1 saved the screenshot's base64 JPEG as a workspace artifact (the field
stripped, a signed link injected at read time) and any body over 256 KB
as a `data.json` artifact (the Amazon product scraper measured 3.29 MB).
This repo has no artifact channel: the base64 string rides the
`screenshot` field and the big bodies ride the output whole. The
screenshot doc says so in `meta.notes`; the size risk is recorded here
(tasks 7.3).

## D8 — Timeouts from v1

Provider 120 s / 120 s (config.yml `mrscraper`: marketplace scrapers
render pages); the seven playground presets 330 s (the upstream page-load
budget alone is 300 s); v1's `SLOW_SCRAPER_TIMEOUTS` (330 s) on the
scrapers the vendor lists at 60 s+ — in part 1: `tiktok/video`,
`youtube/comments`, `youtube/video`; in part 2: `cvs/product`,
`homedepot/product`, `kroger/product`, `lazada/category`,
`meijer/product`; in part 3: `hotels-com/reviews`, `trip/reviews`.

## D9 — What v1 enforced with refines

`google/flights`' "returnDate when type is RT" is a two-arm union (`type`
literal per arm, `returnDate` required on the RT arm). The site gates are
D6. Nothing else in part 1 crossed fields.

## D10 — Synthetic fixtures

No MrScraper key was available, and the marketplace scrapers have no
per-scraper reference online (the docs site is a Next.js app whose API
pages cover the playground only; the marketplace cards live in the
vendor dashboard). Every fixture follows v1's documented output shapes
and its drills: the marketplace envelope with `tokenUsage` equal to the
card, the playground body with `token_usage` and the internals v1 saw
(placeholder ids, a 1×1 JPEG for the screenshot). Replay matched the
engine's URLs on the first run for all eighteen; not live-verified
(tasks 7.1).
