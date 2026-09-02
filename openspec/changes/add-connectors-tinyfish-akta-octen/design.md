# Design: add-connectors-tinyfish-akta-octen

Decision record for the second connector wave. Each connector is a port of
its v1 monid-services adaptor (all structural exa-clones); decisions below
are where the declarative model forced a choice.

## D1 — Port scope: mirror v1's LIVE surface

octen's v1 adaptor defines 11 endpoints but ENABLES only 4 (search,
broad-search, extract, embedding). The other 7 are disabled deliberately —
$0 token-pricing placeholders (answer, chat-completions, messages,
images-generations: enabling would expose free model compute), invite-only
betas (image-search, video-search), and an inadmissible price matrix
(vl-embedding). Porting them would faithfully reproduce the problem v1
disabled them to avoid, so the port rule is: **mirror the live surface**.
Consequence: no image/video Units needed — the hook ABI is untouched and the
engine stays 0.1.0. The 7 return with the pricing pass as their own change.

## D2 — Native units, strictly (akta corrected to credits)

D6/D29's rule ("native units only; uniform pricing is hosted's job") applied
strictly: tinyfish = calls (free), octen = calls / sub-query results /
successful-URL results / input tokens read from the `meta.usage.*` receipt.
For akta the strict reading CORRECTED the draft: its native metering unit is
CREDITS (`credits_consumed` on every response; $1 = 20 credits per
docs.akta.pro pricing), so units = credits with vendor cost DERIVED
(`fromDollars(credits / 20)`) — result counts are display data, not billing
basis. Missing receipts settle at 0 (money follows evidence — v1's rule for
octen extract/embedding).

## D3 — Provider-level hooks earn their keep (akta, tinyfish)

- akta: ONE `input.toRequest` (generic array→CSV: every array query leaf
  joined comma-separated — `Object`/`Array` are lint-whitelisted pure
  globals, so the generic map is a closed term) and ONE credit settle fn on
  the PROVIDER; all six endpoint defs carry only meta + request + schema and
  intern the shared fns once. The engine's scalar-only queryParams rule is
  unchanged — serialization is the connector's business.
- tinyfish: provider-level `presets.usage.perCall()` (both endpoints free).
- octen: NO provider usage — each endpoint's meter differs; per-endpoint
  settle fns.

## D4 — Multi-host providers = per-endpoint baseUrl, no provider default

tinyfish serves each product from its own host; its provider declares NO
`request.baseUrl` and each endpoint carries one — the first real use of the
per-endpoint override, with a test pinning both compiled urls. The
completeness check (url must resolve) covers the mistake of adding a
hostless endpoint.

## D5 — Compiler fix: baseUrl path prefixes survive resolution

Port-discovered bug: `new URL("/v1/company/search", "https://api.akta.pro/api")`
resolves to `https://api.akta.pro/v1/company/search` — absolute paths REPLACE
the base path, silently dropping `/api`. The compiler now CONCATENATES
(trailing-slash-trimmed base + path) and lets the URL constructor validate.
Pinned by a compiler test.

## D6 — Refinements don't survive compilation: document, don't pretend

v1 guarded cross-field rules with `.superRefine()`/`.refine()` on live zod
(tinyfish: recency-vs-dates exclusivity, real-calendar-date checks,
research_paper-only filters; fetch: single-URL conditional validators).
Those checks cannot be represented in the compiled JSON Schema, so keeping
them in defs would be silently dead code. Ported as DOCUMENTED constraints
in the describes; the vendors reject invalid combinations with a 400
(error-as-data). Octen's `stream` rejection, by contrast, DOES survive:
`.strict()` compiles to `additionalProperties: false`, so unknown keys fail
input validation — no defensive toRequest strip needed.

AMENDED (post-review). Two boundary cases refined:

- Single-FIELD format rules DO survive when zod compiles them: `z.iso.date()`
  emits a calendar-aware pattern (month/day bounds, leap years) plus
  `format: date`, and `z.iso.datetime({offset})` likewise — and the engine's
  ajv loads ajv-formats, so both halves are enforced at runtime. Akta's
  `zDate`, tinyfish's `zIsoDate`, and octen's `start_time`/`end_time`
  therefore use the `z.iso.*` validators instead of loose strings; "cannot
  be represented" applies to CROSS-FIELD rules, not per-field formats.
- Tinyfish fetch's single-URL conditional rule (`if_none_match`/
  `if_modified_since` only with one URL) IS technically expressible as a
  compiled `anyOf` of two near-identical object variants. REJECTED: the
  cost is wholesale duplication of a ~12-field schema in the def and an
  unreadable compiled doc, to pre-empt a vendor 400 that already flows back
  cleanly as error-as-data. The describes carry the rule; the D6 line
  (cross-field rules stay prose) holds.

## D7 — Meter blocks absorb; receipts stay

Octen keeps `meta.usage` in v1 output as "the billing receipt". Under v2's
consolidation doctrine the receipt belongs in `usage.evidence` (verbatim
pick) while the meter block is ABSORBED from the payload (deep
`omit(["usage"])` — the documented, accepted risk of a same-named key inside
result content). Akta absorbs `credits_consumed` identically.

## D8 — Synthetic fixtures until keys exist

No vendor keys are held for the three providers; `record` needs live calls.
Fixtures are SYNTHESIZED from v1 sources/docs/test fixtures, named with a
`synthetic-` prefix; replay tests assert consolidation math, wire shape
(the akta fixture URL proves the comma-joined arrays), and absorption. Live
tests gate on `TINYFISH_API_KEY`/`AKTA_API_KEY`/`OCTEN_API_KEY` via
`deno task test:live` (GitHub Actions removed for now; CI returns as its
own change). When keys arrive, `deno task record` replaces the
synthetic fixtures — an open task, not a blocker.

## D9 — Category leaves

New closed-vocabulary leaves (same-PR rule): `news-search`,
`company-enrichment`, `company-news`, `company-reviews`, `funding-data`,
`embeddings`. v1's `web-extraction` maps to our existing `web-scraping`
(same concept, one id). TOP groups/visibility remain hosted concerns.
