# Add the DataForSEO connector

**Status:** In progress
**Source:** monid-services MR !313 (`feat/dataforseo-provider` @ 56649af6, MON-295, unmerged)

Port the DataForSEO provider — 216 endpoints over one prepaid account behind
HTTP Basic auth and one response envelope — into `connectors/dataforseo`:
live Google / Bing / Yahoo / YouTube SERPs, keyword volumes (Google Ads, Bing
Ads, Trends, clickstream), DataForSEO Labs keyword and domain research,
backlinks, website technologies and Whois, content analysis, AI-visibility
(ChatGPT / Gemini / Claude / Perplexity answers and LLM mentions), Amazon and
Google Shopping, Google Play and App Store, Google Business and reviews,
Trustpilot, Tripadvisor, hotels, single-page on-page audits, plus 49 free
dictionaries.

## Why

The catalog's SEO surface today is ahrefs (36 endpoints). DataForSEO covers
the same domain / keyword / backlink data at a lower per-row price, adds live
SERPs, local business, app-store, and AI-answer data the catalog has nowhere
else, and reports the exact USD it debited in every response body — so
settlement is a receipt read, not a rate reconstruction. v1 locked the scope
and the price list on 2026-09-17/18; this change carries them across in the
doc shape.

## What changes

- `connectors/dataforseo/` — `provider.ts` (HTTP Basic inject written out,
  the one-task-array live relay with the envelope verdict, the receipt
  consolidate, the generic evidence, `tasks[0].result` projection, the error
  digest), `schema/auth.ts` (the `{login, password}` credential shape),
  `schema/common.ts` (the locale trio, filters, order_by, limit / depth /
  keywords / targets helpers, the dictionary query, the task state), 216
  endpoints under `endpoints/<v1 family>/<id-dashed>/` with ids = v1's short
  names (`dataforseo#serp/google-organic`), a provider-level
  `provider.test.ts` + `test-inputs.json`, and 227 synthetic fixtures.
- `connectors/categories.ts` — three leaves from the monid-services taxonomy
  manifest: `image-search`, `video-search`, `equities`.
- `connectors/ids.lock.json` — the 216 new ids.
- No engine, shared, or config change.

## Owner decisions (2026-09-21)

1. Ids are v1's short names, declared with `endpoint:` (apify / mrscraper
   precedent — `/v3`, `live/advanced`, `task_post` are transport plumbing).
2. HTTP Basic is written inline in the provider's `auth.inject` (no shared
   preset); the credential is `{login, password}`.
3. `limit` (per-row products) and `depth` (page-billed products) stay
   optional as in v1; the binding carries the vendor's default so an
   omitted knob still holds the vendor's page (100 rows / one page) and the
   settle is the receipt. (A first-round choice to require them was
   reversed the same day: 83 defs would have failed on a missing field.)
4. Dictionaries take an optional `search` and an optional `limit` (1–1000),
   applied in the endpoint's start; with neither the whole list is returned
   — inline, because this engine has no output-overflow channel yet.

## Non-goals

- `/pinterest/pin-counts` — v1 shipped it disabled (upstream 50304
  "temporarily unavailable" with `tasks: null` in the 2026-09-18 drill); the
  route is also gone from the vendor's OpenAPI at 89d7d681 (2026-09-20).
- `/serp/google-events` — removed upstream between the OpenAPI revision v1
  mirrored (e9c59102, 2026-09-09) and HEAD (89d7d681, 2026-09-20); its docs
  page answers 404 (probed 2026-09-21). Tasks 6.3 if it returns.
- Everything v1 did not ship: `regular` / `html` variants of Live products,
  `_lite` LLM-mentions variants, Standard-mode duplicates of Live products,
  `lighthouse/task_post`, the account-scoped surfaces (`tasks_ready`,
  `tasks_fixed`, `id_list`, `errors`, `user_data`, `status`,
  `webhook_resend`), the on-page crawl family and `serp/screenshot` /
  `serp/ai_summary` (deferred by v1), the unscoped `locations` and
  `languages` lists.
- `postback_url`, `postback_data`, `pingback_url`, `tag`, `priority` — not
  in any mirror (strict objects reject them): callbacks would deliver results
  outside billing; the connector sets the priority.
- Three v1 platform mechanisms this engine does not have yet — the 256 KB
  output-overflow artifact, the observed-cost record on a failed exchange
  (v1 `calculateBilling`: cost recorded, user not charged), and the balance
  probe. They are engine gaps, not connector choices (design D6 / D8,
  tasks 6.4 / 6.5).
- v1's prod registry overlay is `include: false` (waiting for the prod
  secret); the MR itself is unmerged. This port follows the owner's request,
  not the overlay.

## Impact

- New provider in the compiled catalog: 216 docs, 3 new category leaves.
- No schema, engine, or fn-ABI contract change (`version:check`: no bump).
- Fixtures are synthetic (no DataForSEO credentials held); the one recorded
  shape is a real 401 body captured without credentials. Live behaviour is
  unverified — tasks 6.1.
