# Proposal: add-connector-cloro

## Why

Agents that do GEO and SEO work need to know what AI assistants and Google
show to a real user in a given country: which brands an answer names, which
pages it cites, and where a page ranks. A model API completion does not
answer that question. The consumer products (ChatGPT, Gemini, Perplexity,
Copilot, Google AI Mode, Google Search) give different answers from
their APIs, with web search, citations, shopping cards and ads.

cloro scrapes those products and returns the result as structured JSON. The
catalog has `ai-search` and `geo` leaves, but no endpoint that returns the
consumer answer of these assistants.

Mechanically it is an easy fit: one base URL, bearer auth, seven
JSON endpoints, and an `X-Credits-Charged` header on every successful
response. No new engine capability is necessary.

## What Changes

- **connectors/cloro**: 7 endpoints against `https://api.cloro.dev/v1`,
  bearer auth:
  `POST /monitor/chatgpt`, `/monitor/gemini`, `/monitor/copilot`,
  , `/monitor/perplexity`, `/monitor/aimode`,
  `/monitor/google` and `/monitor/google/news`.
- **The vendor meter is a header.** cloro puts the credits it charged in
  `X-Credits-Charged`, not in the body. The provider declares a sync
  `lifecycle.start` relay (the ahrefs pattern) that reads the header into
  `state.data.creditsCharged`, and a provider `usage.consolidate` that
  claims it. The claim includes per-organization overrides and the AI Mode
  product adjustment. A missing or malformed header falls back to the card.
- **The def is cloro's rate card.** Each endpoint is a COMPOSITE: a `call`
  line (base credits + the 2-credit sync surcharge) and one PER_UNIT line per
  add-on the request can turn on:
  - `state_targeting` (+2) on ChatGPT, Gemini, Copilot, Perplexity.
  - `raw_data` (+2, once) on ChatGPT for any of `rawResponse`,
    `searchQueries`, `ads`, `shopping`.
  - `ai_overview` (+2, once) on Google for `aioverview` or `paaAioverview`.
  - `extra_page` (+2 per page after the first) on Google and Google News.
    For a Google `url` request, the page count comes from the URL's `num`,
    as cloro derives it.
  - `expanded_product` (+1 per cluster returned, at most 6) on AI Mode.
    The estimate holds the documented maximum of 6; evidence counts
    `result.productResults`.
  Rate card: https://cloro.dev/docs/guides/providers, checked 2026-09-21.
- **Faithful mirrors.** Each `schema/inputs.ts` mirrors the OpenAPI request
  body with optionality only. cloro rejects unknown fields
  (`additionalProperties: false`), so the mirrors are strict objects.
  Where cloro requires one of several fields (`country` or `gl` on AI Mode
  and Google News; `query + country`, `query + gl` or `url` on Google), the
  binding is a union with required keys per arm, which compiles to `anyOf`.
  The
  one binding default is Google News `pages` (1), which the estimate reads.
  Google `pages` stays optional, because cloro rejects it together with
  `url`.
- **Run mode by measured latency.** Wall clock per sync call (monid drill
  2026-09-22, end-to-end run 2026-09-23): Google 4-18 s, Google News
  4-8 s, AI Mode 7-24 s, Gemini 31-38 s, Perplexity 36-45 s, Copilot
  34-54 s, ChatGPT 16-58 s with one call at 91 s and one at 162 s.
  - Google, Google News and AI Mode run sync: the provider
    `lifecycle.start` makes the call.
  - ChatGPT, Gemini, Copilot and Perplexity run async on monid's side. The
    endpoint `lifecycle.start` returns RUNNING with no IO, and the first
    `lifecycle.poll` makes the same single `/v1/monitor/*` call. The poll
    source is the provider relay, so it interns to the same fnTable entry.
    `timeouts.pollMs` is 1 s.
  - There is one endpoint per engine. The vendor async API is not used.
- **Errors.** A provider `output.fromError` digests
  `{error: {code, message}}` into `{message, code?, raw}`.
- Synthetic provider-level fixtures (`synthetic-answer`,
  `synthetic-unauthorized`) for the billing cases, plus real recordings for
  `google` and `chatgpt`. The recorded `X-Credits-Charged` (5 and 7) equals
  the card.
- `shared/testing/fixtures.ts`: `x-credits-charged` joins
  `RECORDED_RES_HEADERS`, so the recorder keeps the meter.

## Capabilities

- `cloro-connector`.

## Non-goals

- `/v1/monitor/grok` is not ported. cloro marks Grok as temporarily
  unavailable (Grok blocks anonymous access), and every call fails.

- The vendor async API (`/v1/async/task`, `/v1/async/task/batch`) is not
  ported. A second endpoint per engine that returns the same data makes it
  harder for an agent to pick one. The slow engines run async on monid's
  side instead, with the same `/v1/monitor/*` call.
- `/v1/monitor/google/goto`, `/v1/countries`, `/v1/states` and
  `/v1/credits` are free utility reads and are not ported.
- No dollar conversion in the doc. cloro's price per credit depends on the
  plan, so the pool is cloro credits and the conversion is the broker
  card's job.

## Impact

New connector tree, 7 new ids in `connectors/ids.lock.json`, and one new
recorded response header. No new
`Unit`, preset, hook or category, and no compiler or engine change.
