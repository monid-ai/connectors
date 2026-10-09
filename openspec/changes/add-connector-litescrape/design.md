# Design: add-connector-litescrape

Decision record for the Litescrape port. v1 source: monid-services MR !310
(`services/shared/providers/adaptors/litescrape/`, branch
`feat/add-litescrape-provider` at e4f330ee, 2026-09-18; the v1 change
`openspec/changes/add-litescrape-provider/` has a proposal and tasks, no
design). Precedents: akta (sync GET + queryParams, the provider-level
array→CSV `toRequest`), surf D2 / D11 (one provider-level suite over a
one-shape family, folders named by wire path), surf D4 and clay D13
(unions), mrscraper D4 (PER_UNIT·RESULT 0|1 on a flat card, empty = 0),
apollo (empty = 0), bytedance D6 and minimax D6 (`.regex()` for URL
fields).

## D1 — Ids are the vendor's `<engine>/<kind>` paths; folders by family

v1 published its own ids (`/google/maps-photo`, `/google-play/apps`,
`/app-store/search`, `/apple-maps/places`) over wire paths that differ
(`/api/google/maps/photo-meta`, `/api/google/play/apps`,
`/api/apple/app-store/search`, `/api/apple/maps/places`). v1 is an unmerged
MR, so nothing published binds them; the ids here derive from the wire
path with the `/api` prefix on the base URL (`litescrape#google/search`,
`litescrape#google/play/apps`, `litescrape#apple/app-store/search`), the
same `<engine>/<kind>` the vendor's docs and follow-up links are keyed
by, so a link's path IS the endpoint id (D5). No `endpoint:` pins.
Folders are `endpoints/<first segment>/<wire path, slashes as dashes>/`
(surf D11: leaf names must be unique across groups; `reviews` and
`search` collide across families).

## D2 — The pool is Litescrape credits, one per call (owner, 2026-09-20)

The vendor sells prepaid credits at one flat price — $0.15 per 1,000
calls across every endpoint (litescrape.com/pricing, captured 2026-09-16)
— and counts the balance in calls (`GET /api/keys/status` →
`remaining_calls`, `cents_per_1000_calls: 15`; the Maps docs say "each
successful page request costs one credit"). v1 carried $0.00015 per call
in dollars; here the pool is the vendor's own unit (`default: { label:
"Litescrape credits" }`) and every line draws 1, the hunterio /
mrscraper posture: the doc records what the vendor counts, the $/credit
is the broker card's. No response carries a meter, so there is no
`consolidate`; the derived fold is the bill and `provider.test.ts` holds
the 33 draws as literals (clay D7a).

## D3 — An empty success records 0: PER_UNIT·RESULT with an own 0|1 evidence per endpoint (owner, 2026-09-20)

v1's 2026-09-18 drill (68 calls reconciled against the key status)
established that the vendor deducts one credit on EVERY HTTP 200,
including an empty one — a review page past the end, `popular_times:
null`, a listing with no `posts` group — and v1 chose to record those as
0 (the platform absorbs the credit). The owner kept that posture. A flat
`PER_CALL` line is engine-appended as 1 on any 2xx and cannot be zeroed,
so every endpoint's line is `PER_UNIT · RESULT` (amount 1) and each
endpoint states its own evidence: v1's `hasAnyResultGroup` over its
`RESULT_GROUPS` entry — 1 when the body carries one of the listed keys as
a non-empty array, non-empty string, non-empty object, or non-null
scalar, else 0. Hooks are closed terms, so the group list is a literal
inside each fn; endpoints with the same list intern to one fnTable entry
(the six `["reviews"]` readers share one; 22 distinct fns for 33 docs).
The provider promises one call (`estimate: RESULT 1`).

The two drill corrections v1 recorded are kept: `google/maps/photo-meta`
keys off `user` + `location` (the docs once said `photo`), and
`google/search` counts `knowledge_graph` alone as a result.

## D4 — Errors are data

Litescrape's stable error body is `{ error, error_code, status_code,
request_id, retryable }` (litescrape.com/docs/reference, "Stable error
bodies"); 400 `invalid_request` for a missing, oversized, or unknown
parameter (the docs say 403 — v1 drill), 401, 402 credits exhausted, 404
`not_found` (no AI Overview — free) / `route_not_found`, 429, 503. The
provider `fromError` digests it to `{ message: error, error_code, raw }`.
Every non-2xx is error-as-data with zero usage; the overview's free 404
therefore costs nothing here too.

## D5 — The vendor's follow-up links are relayed verbatim (owner, 2026-09-20)

Every response embeds ready-made `https://api.litescrape.com/api/...`
links (`pagination.next`, `litescrape_pagination.*`, `reviews_link`,
`place_id_search`, `photo_meta_link`, `litescrape_product_link`,
`litescrape_place_link`, …; the `raw_file` / `prettify_file` archive
links; `search_metadata.json_endpoint` echoing the request). v1's
`providerFormatOutput` rewrote each into `{ endpoint, queryParams }` for
the catalog endpoint relaying it, coercing the query to that endpoint's
schema — a walk that consults the catalog and every target's zod schema,
which a closed-term hook cannot do. Options weighed: relay verbatim;
strip the archive links and the echo; hand-parse into `{ endpoint,
queryParams }` with guessed types (a `start=20` would arrive as the
string "20" and fail the next run's strict gate). Chosen: verbatim, no
`fromResponse`; the provider note states the mapping (`<path>` after
`/api` is the endpoint id, the query string its queryParams), which D1
makes exact.

## D6 — One provider-level suite, per-endpoint fixtures

33 docs of one billing shape and one evidence idiom (surf D2): a
per-endpoint `endpoint.test.ts` would be 33 near-identical files.
`connectors/litescrape/provider.test.ts` iterates the catalog — the
literal rate table, the happy replay per endpoint (usage deep-equalled,
output deep-equalled to the fixture body so the links are proven
verbatim), the CSV join on the three array fields, the empty cases v1
drilled (ten docs), the 401 digest on one endpoint per family, the
overview's 404 and a 400, strictness on all 33, the union and pattern
gates with passing near twins, provenance, compiled URLs, meta, one gated
live case. Fixtures stay per endpoint under
`endpoints/<family>/<path>/fixtures/` (replay matches the exact wire URL;
`deno task record` writes there too); `test-inputs.json` carries one
valid input per endpoint.

## D7 — v1's `superRefine` rules: unions where "one of", notes elsewhere

`.refine` / `.superRefine` compile to nothing. The seven "at least / exactly
one" rules are `z.union` bindings (surf D4, clay D13): `q | ludocid |
kgmid` (search, ai-overview), `q | shoprs` (shopping), `gpcid ⊕ prds`
(shopping/product — each arm `.omit()`s the other, and the `prds` arm also
omits the two docids that "go with gpcid"), `(q + type) | place_id ⊕
data_cid ⊕ data` (maps — the search arm requires both `q` and `type`,
encoding v1's "type is required when searching by q"), `place_id ⊕
data_id` (reviews), `q | place_id` (bing/maps), `bbox ⊕ (lat + lon)`
(duckduckgo/maps). Union arms carry no binding default (ajv skips
`useDefaults` inside `anyOf`); none is authored anywhere in this
connector — no field is a price selector or an estimate input, so the
vendor's server-side defaults stand and are stated in each describe.
Every other rule (paired `lat`/`lon`, exclusive origins, `radius` ≤ 199
on desktop, one Shopping refinement, the Play listing grammar, `season_id`
needs `store=tv`, `mkt` ⊕ `cc`, `m` ⊕ `search_assist`, …) rides
`meta.notes` and the vendor's 400 (error-as-data, zero usage).

Two single-field rules v1 wrote as `.refine` compile as patterns: Apple
`muid` ≤ 18446744073709551615 (a digit-prefix enumeration, tested at the
boundary both ways) and the App Store `term`, whose 2,048-UTF-8-byte bound
has no JSON Schema form — `maxLength: 2048` (characters) is the closest
gate; multibyte terms past the byte bound reach the vendor's 400.

## D8 — Large integers

v1 parsed bodies with an `exactIntegerReviver` keeping any integer past
2^53 as its digit string. The engine's output is JSON as JS numbers and no
hook can change the parse. v1's drill saw every large id (Apple `muid`,
Shopping `gpcid` / `headline_offer_docid` / `image_docid`, contributor ids)
arrive as a JSON string in all 45 bodies, so nothing is rounded today; the
inputs mirror them as decimal strings. Eyes open: a bare integer past
2^53 would round silently.

## D9 — v1 ↔ live docs (2026-09-20)

The 33 per-endpoint pages and the extended reference
(litescrape.com/docs/reference) were diffed field by field against v1's
schemas (captured 2026-09-16 by the same author). Differences:

| field | v1 | live |
|---|---|---|
| `google/search`, `google/ai-overview` `oq`, `gs_lp`, `sclient` | absent | "forwarded verbatim" autocomplete-lineage tokens → mirrored as optional strings |
| `google/local` `start` | `max(1000)` (a v1 review tightening) | "through 10,000; offsets above 1,000 return empty" → `max(10000)`, the describe says where the source ends |
| `bing/search` `engine` | absent | one accepted value, `bing`, fixed by the endpoint → not mirrored |
| `google/maps/web` | Alpha endpoint | route gone (404 `route_not_found`, docs page 404) → not ported (proposal Non-goals) |

Everything else — names, required, enums, bounds, defaults, the three
Yelp fields documented as "returns 422 when set" and deliberately not
mirrored — matches.

## D10 — Synthetic fixtures

No Litescrape key was available at port time. Every fixture is
`synthetic-*`: the envelope (`search_metadata`, `search_parameters`, the
result groups, the follow-up links) follows the reference page's
"Response structure" examples and the drill bodies quoted in v1's tests
(the App Store reviews page past the end, the Maps result with
`reviews_link` / `place_id_search`); the error bodies are the reference's
"Stable error bodies" with the live-probed 401 / 404 text. Wire URLs were
captured from the engine (`Engine` + `directTransport` with a recording
fetch) so replay matching is exact, including the CSV-joined arrays and
the `@`/`:`/`,` escapes. Business names, reviewers, ids, and links are
placeholders. Unverified against live traffic — tasks 6.1.
