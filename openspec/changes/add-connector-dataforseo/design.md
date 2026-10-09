# Design — DataForSEO connector

Only the choices the port forced. Everything else is v1 (MR !313 @
56649af6) carried across in the doc shape.

## D1 — Ids are v1's short names; folders are the id dashed

Every wire path is `/v3/<api>/<product>/<function>` where the function
segment (`live/advanced`, `task_post`, `locations/{country}`) says how the
call travels, not what it is. v1 named each def `/<segment>/<kind>`
(`/serp/google-organic`, `/labs/ranked-keywords`); the owner kept those
names (2026-09-21, the apify / mrscraper posture: `/v2/acts/…/runs` and
`/api/…/sync` are plumbing too), so each endpoint declares `endpoint:` and
the id is `dataforseo#serp/google-organic`. The folder is
`endpoints/<v1 family>/<id with slashes as dashes>/` — the family is
organisational (the loader wants leaf names unique across groups, surf
D11), the leaf is derivable from the id, and the suite looks the family up
once from the tree. `connectors/ids.lock.json` gains the 216 ids.

## D2 — HTTP Basic, written out

The account authenticates with `Authorization: Basic base64(login:
password)`. No preset speaks Basic, `btoa` is not a whitelisted global of a
closed term, and adding a shared preset would make the PR more than a
connector — so the owner chose (2026-09-21) the opoint posture: the
credential shape `{login, password}` lives in `schema/auth.ts`, and the
provider's `auth.inject` encodes UTF-8 + base64 by hand (the suite pins the
header against `btoa` for ASCII and for a non-ASCII pair). Locally:
`DATAFORSEO_CREDENTIALS_LOGIN` / `DATAFORSEO_CREDENTIALS_PASSWORD`.

## D3 — The envelope verdict is a provider-level `lifecycle.start`

Every product is a POST whose body is a JSON array of ONE task, and every
answer is HTTP 200 (401 / 402 / 404 / 500 excepted) with the verdict in the
body: `status_code` on `tasks[0]`, falling back to the top level (`tasks:
null` on a 50304). A declarative doc would bill a flat line on any 200, so
the provider's `start` (minimax D3 / opoint D1) wraps the validated body
into the array, then: non-2xx → data; 20000 or 40106 (partial results,
charged only for the pages returned) → success; anything else, including
an absent verdict, → v1's synthesized class with `providerHttpStatus` 200
— 40100 → 401, 40200 / 40210 → 402, 40104 / 40201 / 40203 / 40204 → 403,
40102 / 40401 → 404, 40105 → 410, 40202 / 40205 / 40206 / 40209 → 429,
405xx → 400, else 502 (40106 partial results is a success everywhere,
lookups included). The status table is repeated in the five start / two
poll texts because a closed term cannot share it; identical texts intern.
Five starts cover the catalog: the provider's (141 POST products), the
task_post (25), the filtering dictionary (34), the app category lookup (2:
the vendor answers one row of names, so search / limit apply to the names
inside it), the plain GET relay (13 catalogues + the seller ad-link
resolver).

## D4 — Billing: one USD pool, the receipt as the claim, four model shapes

The body's top-level `cost` is the exact USD debited (v1 drill 2026-09-18:
19 calls, Σ cost == balance delta), so the pool is `US dollars` (exa /
apify) and `usage.consolidate` claims `cost` — plus the task_post charge a
queued run stashed in its own state, since the task_get body reports 0. A
FREE doc claims nothing (a nonzero claim on a FREE doc is a loud engine
error by design). The rate card is the account's price list
(`user_data.price`, 2026-09-18):

| v1 card | v2 model | count |
|---|---|---|
| `makePerCallPrice(p)` | `PER_CALL` amount p | — |
| `makePerCallPrice(p)` + `pageEstimate(n)` | `PER_UNIT · RESULT`, `every: n`, amount p | results asked for: `max(depth, max_crawl_pages × n)` (request-driven, v1 `pageEstimate`) |
| `makePerResultPrice(r, fee)` | `COMPOSITE { base_fee: PER_CALL fee, rows: PER_UNIT · RESULT r }` | `result[0].items` length, else `items_count` (v1 `resultItemCount`) |
| `makePerResultPrice(r)` | `PER_UNIT · RESULT` r | same |
| `makePerCallPrice(0)` | `FREE` | — |

`every: n` is a true block rate here — the vendor bills per page of n
results, so 25 results at 10 per page is 3 pages. The page count is
request-driven on purpose: the output carries no page number, and the
receipt corrects a partial delivery (40106) while the fold flags it as
`mismatch`. One generic provider `evidence` keys the count by the doc's
own model (akta's shape). SERP add-ons (`load_async_ai_overview`,
`people_also_ask_click_depth`, `calculate_rectangles`, clickstream ×2) are
not separate lines: the receipt carries them, as in v1. The HOLD includes
them (v1 `withSurcharges`, !313 8f8a1771), expressed as counts since an
estimate returns no dollars. `calculate_rectangles` is priced two ways by
the vendor: Google and Bing organic say "charged extra $0.002" (one live
page price — one more page), Google News, Search by Image, and Seznam say
"the charge per task will be multiplied by 2" (the whole page count,
rounded up to pages first, doubled — v1's one-extra-base under-holds these
on multi-page requests). Google organic adds one page for
`load_async_ai_overview` and one for any `people_also_ask_click_depth`
($0.00015 a click, at most 4, fits in one page); a Labs product with
`include_clickstream_data` holds twice the rows plus 100 rows (its base fee
is exactly 100 rows at every Labs card). The four flat cards that take a
priced switch (`serp/google-ai-mode`, `google-hotels/info`,
`onpage/instant-pages`, `onpage/content-parsing`) cannot carry it as a
count: their hold stays one call and the receipt settles above it.

## D5 — `limit` and `depth` stay optional; the binding carries the vendor's default

v1 left both optional and held the vendor's default page (100 rows, 10
results) when omitted, settling at the receipt. The owner kept that
(2026-09-21; a first-round choice to require them was reversed the same
day — 83 defs would have started failing on a missing field): every
per-row binding is `zBody.extend({ limit: zBody.shape.limit.unwrap()
.default(n) })` (50 docs) and every page-billed one the same on `depth`
(33 docs), n = the vendor's documented default (the `zLimit` / `zDepth`
helper's second argument, or the inline `describe` on the five products
written without the helper). The default materializes on the wire — it
equals what the vendor would apply — and the estimate reads the typed
knob. `serp/google-search-by-image` has no `depth`; its estimate reads
`max_crawl_pages ?? 1` (honest optionality). The 17 per-row docs whose row
count is not a caller knob (summaries, histories, timeseries) promise one
row — v1's default estimate for a PER_RESULT card. Array-metered docs
promise the array's length (20).

## D6 — Queued products: task_post + task_get, priority 2, `postCost` state

25 products exist only in Standard (queued) mode. Their `start` posts the
one-task array with `priority: 2` (v1 decision 2026-09-18: high priority,
about one minute, twice the standard price), and 20100 + a task id →
RUNNING with `state.data.postCost` = the receipt (`lifecycle.state`
declared per endpoint — a provider-level declaration would be dead config
on the 191 sync docs). 20000 / 20100 without an id → synthesized 502 (v1).
`poll` derives the task_get path from the compiled request URL
(`task_post` → `task_get/advanced/{id}` on 18, `task_get/{id}` on 7):
upstream 5xx, 40601 / 40602 (handed / queued), 40202 / 40209 (rate limit)
→ RUNNING (v1; `runMs` 30 min bounds the wait); other non-2xx and any
other verdict → COMPLETED as data with the synthesized class. An unknown
verdict is a failure, not "still running" (minimax D7a): DataForSEO's
verdict space is documented and the pending codes are explicit. Engine
gap, eyes open: a task that fails after task_post loses its post charge
in the ledger — the engine forces zero usage on a non-2xx settle, while
v1's `taskPoll` wrote `postCost` into `actualCost` and the platform's
`calculateBilling` records the cost without charging the user. Same
posture as surf D3; tasks 6.4. No `stop`:
the vendor has no cancel.

## D7 — Dictionaries: `search` and `limit` optional, filtered in start

The 49 free lookups have no query surface upstream and a country's
locations run to 60k rows / 20 MB. v1 filtered `search` / `limit` in the
worker and spilled anything above 256 KB into an artifact. The owner kept
v1's contract (2026-09-21): both optional, applied by the dictionary
`start` on the fetched rows (`utils.request({ queryParams: {} })` keeps
our two params off the wire; the 15 per-country lists take `country` as a
path param); with neither the whole list is returned — inline, because
this engine has no output-overflow channel (D8, tasks 6.5), so the largest
lists may exceed the run record until that channel exists. The 13
catalogues that return one nested object (`available_filters`,
`technologies`, `lighthouse/audits`, …) take an empty strict query — v1
accepted and ignored `search` / `limit` there; here they are INVALID_INPUT.

## D8 — Output = `tasks[0].result`; the digest; no overflow channel

v1 relayed `tasks[0].result` (decision 2026-09-18) and this port keeps it
as a provider-level `output.fromResponse` (runs after consolidate and
evidence, which read the raw envelope); an absent or non-array result is
`[]`. `fromError` digests `status_message` / `status_code` from the task,
falling back to the top level, raw body kept. v1's 256 KB output-overflow
artifact is an engine gap here, not a choice: a depth-200 SERP (~300 KB)
and an unfiltered locations list are returned inline (mrscraper D7
posture; a provider note says so; tasks 6.5).

## D9 — v1 ↔ live

The mirrors are v1's (OpenAPI e9c59102, live-verified 2026-09-17/18).
Re-diffed against OpenAPI HEAD 89d7d681 (2026-09-20) for the 218 paths:
zero field / enum / default / bound / required changes; two paths gone —
`business_data/social_media/pinterest/live` (v1 already disabled it) and
`serp/google/events/live/advanced` (docs page 404 too). Both are
Non-goals. Timeouts are config.yml's: 130 s request / run; the two AI
search docs keep v1's 100 s; the queued 25 keep 30 min / 10 s.
`z.record(z.string(), z.unknown())` mirrors are written `z.any()` — the
same JSON Schema, and the typed spread in the task start stays
Json-assignable.

## D10 — One provider-level suite, synthetic fixtures, literal tables

216 docs of four shapes settled by one evidence and one consolidate: the
suite iterates the catalog (surf D2) while every endpoint keeps its own
fixtures. The rate table is a literal per doc (clay D7a), and a happy run's
`usage` is deep-compared against the receipt — the fold must agree to 1e-9
or a `mismatch` key breaks the equality. No credentials were held, so
every fixture is synthetic (envelope from v1's drill fixtures; the real
401 body was captured without credentials); PR body says so, tasks 6.1.

## D11 — The LLM cap rides `toRequest`

v1 layered `max_output_tokens: 1024` UNDER the caller's body on the four
LLM response docs (a floor price of $0.0006 plus the model's token cost
from the receipt). A binding `.default()` must be the vendor's default and
this is ours, so the four docs share one `toRequest` that merges the cap
under the caller's fields (bytedance's `utils.json.merge` posture): a
smaller caller value wins.

## D12 — Not carried

`hints` became one sentence at the end of each description naming the
dictionary id (`call dataforseo#serp/google-locations`); `tags`,
`visibility`, `price` (markup 0), the balance probe, and the
`exactIntegerReviver` concern (every large id arrives as a string) are
not carried.
