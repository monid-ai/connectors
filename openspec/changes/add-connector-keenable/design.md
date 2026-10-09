# Design: add-connector-keenable

Decision record for the Keenable connector (new; not a v1 port). Only the
choices the declarative model forced are recorded; the input schemas
mirror OpenAPI SearchRequest / fetch parameters (docs.keenable.ai
api-reference/openapi.json, 2026-09-16).

## D1 — Authenticated REST only

Keenable ships each operation twice: a keyed path (`POST /v1/search`,
`GET /v1/fetch`, `X-API-Key`) and a keyless `/public` twin
(`X-Keenable-Title`, shared 1,000 req/hour per IP, no credits). The
catalog is a metered, keyed surface. The public twins are an evaluation
tier with a different auth header, different rate-limit identity, and
no usage — exposing them would be a second provider with a different
auth inject and a FREE model, which is its own change if anyone wants
it. Both docs call the keyed paths. Identity is inferred from
`request.path` (design D22): `keenable#v1/search` and
`keenable#v1/fetch`. No authored `endpoint:` pin.

## D2 — One pool, PER_CALL 1, no consolidate; empty search bills 0

Credits docs (2026-09-16): authenticated usage is metered in credits;
"search and fetch each cost one"; 100,000 requests/month free, then
purchased packs. Monid's v1 drill (2026-09-28, MCP
`_meta["keenable/usage"]` per SKU) measured every SKU a doc can select
— `search.pro`, `search.realtime`, `fetch`, `fetch.live`, with or
without `prompt` — at one credit for Monid's organization. REST JSON
carries no usage object, so there is no vendor claim to pluck (no
`usage.consolidate`) and the derived fold settles — the pdl posture.

One pool `default` ("Keenable credits"), a provider-level `PER_CALL` of
1. Fetch inherits it. Search overrides it with `PER_UNIT` `RESULT` and
its own evidence: `results: []` still draws a credit (console balance
delta, drill 2026-09-28) but bills 0 — v1's posture (`searchActuals`),
the same shape as litescrape's empty success. The estimate promises one.

A fetch the target refuses (403/404/422/500) also draws a credit
(drill 2026-09-28 / 2026-10-01); here it settles as a provider error
with zero usage, as every non-2xx does. v1 records that credit as
Monid's cost; the declarative model has no seam for it and the buyer
pays nothing either way.

Rejected: two pools keyed on SKU (every SKU is one credit); a FREE
model (authenticated calls draw the monthly allowance).

## D3 — Search `mode` is a request field

OpenAPI SearchRequest has no `mode`, but the REST body accepts it: the
v1 drill (2026-09-28) sent `mode: "pro"` and `mode: "realtime"` to
`POST /v1/search` and each drew one credit. So `mode` is an optional
string — the values (`pro` default, `realtime`) live in the describe,
not a `z.enum` (vendor enumerated strings stay `z.string`, repo
convention). The response echoes the mode served.

## D4 — `live` fetch is on the catalog

`live=true` is a documented query param (`fetch.live` SKU). The credits
docs say it "draws more than one credit" without a number; the v1 drill
(2026-09-28) measured one for Monid's organization, the same as an
indexed fetch. So `live` is an optional boolean under the same PER_CALL
of 1.

## D5 — Fixtures: recorded 401, synthetic happy

A malformed key against the keyed paths (2026-09-16) returned HTTP 401
`{error: "Authentication failed", message: "Malformed API key"}` on
both endpoints. Auth docs table lists malformed keys as 400; the live
keyed endpoint answered 401. Those two chains are recordings.

Happy chains are `synthetic-`: the response shape was read off the
public twins the same day (search: `query`/`mode`/`results[]` with
`title`/`url`/`description`/`snippet`/`published_at`/`acquired_at`;
fetch: `url`/`title`/`content`/`description`) and the request URL was
rewritten to the authenticated path the doc calls. Replay matches
method+URL; search uses `{{request.url}}`, fetch pins the engine's
`URLSearchParams` encoding of `url=https://example.com`. Replace via
`deno task record` when `KEENABLE_API_KEY` exists.
