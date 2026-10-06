# Tasks

## 1. Provider

- [x] 1.1 `connectors/dataforseo/provider.ts` — Basic inject (UTF-8 +
      base64 written out), live one-task relay with the envelope verdict,
      receipt consolidate (+ stashed task_post charge), generic evidence,
      `tasks[0].result` projection, error digest, 130 s timeouts.
- [x] 1.2 `schema/auth.ts` (`{login, password}`), `schema/common.ts`
      (locale, filters, order_by, limit / depth / keywords / targets,
      dictionary query, empty query, task state).

## 2. Endpoints (216)

- [x] 2.1 141 live POST products (85 fee + rows, 42 flat, 13 page-billed,
      1 per-row without fee) — provider start inherited.
- [x] 2.2 25 queued products — own `start` (task_post, priority 2, state
      `postCost`) + `poll` (task_get / task_get advanced), 30 min / 10 s.
- [x] 2.3 36 row dictionaries (search / limit in start, 15 with a country
      path; the two app category lists filter the names inside their one
      row) + 13 whole-object catalogues + the seller ad-link GET.
- [x] 2.4 The four LLM response docs pin `max_output_tokens: 1024` under
      the caller's fields in `toRequest`.
- [x] 2.5 `connectors/categories.ts` — `image-search`, `video-search`,
      `equities`.

## 3. Tests and fixtures

- [x] 3.1 `provider.test.ts` — literal rate table (216 cards), model per
      card, provenance (1 inject / relay / digest / meter / evidence, 5
      starts, 2 polls, 21 estimates), meta, schemas, happy replay for every
      endpoint, wire shape (one-task array, Basic header, priority 2, LLM
      cap, dictionary path), UTF-8 credentials, empties, items_count,
      40106, the in-band verdicts, the queued chain, strict + blocked
      fields on every doc, the vendor-default holds on limit / depth, the dictionary gates,
      two gated live tests.
- [x] 3.2 `test-inputs.json` (216) and 227 `synthetic-*` fixtures.

## 4. Gates

- [x] 4.1 lint, check, test, double compile byte-identical, version:check
      no bump, zero fields without description, no Chinese.
- [x] 4.2 Red drills: an amount, the result projection, a binding default.

## 5. Docs

- [x] 5.1 proposal / design (D1–D12) / spec / tasks.

## 6. Follow-ups

- [ ] 6.1 With credentials: `deno task record` the happy scenarios
      (start with the free dictionaries and one page of `serp/google-organic`
      at $0.002), replace the synthetic fixtures, run `test:live`.
- [ ] 6.2 Record a real 402 (balance exhausted) and a real 40202 to confirm
      the synthesized classes.
- [ ] 6.3 `serp/google-events` if the vendor restores it; `pinterest/pin-
      counts` if a live call answers 20000.
- [ ] 6.4 A queued task that fails after task_post loses its post charge in
      the ledger (engine zero-usage on non-2xx); revisit when the engine
      grows a partial-usage channel (surf D3).
- [ ] 6.5 Engine gap: no output-overflow channel (v1 spills > 256 KB into a
      `data.json` artifact). A depth-200 SERP, a 1,000-row Labs page, and
      an unfiltered locations list (US: 20 MB) return inline; the largest
      may exceed the run record until the channel exists.
- [ ] 6.6 `connectors/ids.lock.json` on main is already behind (bytedance,
      fundable, hunterio, litescrape ids); this change adds only its own
      ids — a full `ids:check --update` is a separate housekeeping commit.
- [ ] 6.7 The four flat cards with a priced switch (`serp/google-ai-mode`
      `calculate_rectangles`, `google-hotels/info` `load_prices_by_dates`
      ×2, `onpage/instant-pages` and `onpage/content-parsing` rendering
      switches up to ×34) hold one call; v1 holds the surcharge. A PER_CALL
      estimate has no count to raise — needs a model change or an engine
      dollar-hold (design D4).
