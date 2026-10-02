# Proposal: add-connector-linkup

## Why

[Linkup](https://www.linkup.so) is a real-time web search API for AI
agents: `/search` at four depths (`flash`, `fast`, `standard`, `deep`) that
returns raw sources, a sourced answer, or schema-shaped JSON, and `/fetch`,
which turns one public URL (HTML or PDF) into clean markdown. Both are
synchronous JSON POSTs with bearer auth and a flat, published USD price per
call, so the connector needs no new engine capability.

## What Changes

- **connectors/linkup**: provider (`presets.auth.bearer()` on
  `https://api.linkup.so/v1`) + 2 endpoints, `search` (`POST /search`) and
  `fetch` (`POST /fetch`). Follows the same structure as `connectors/exa/`.
- **The def is Linkup's rate card**
  (https://docs.linkup.so/pages/documentation/platform/pricing, verified
  2026-10-01). The pool is US dollars (Linkup prices in USD), pinned and
  re-audited on repricing, the exa posture. Each endpoint is a COMPOSITE
  with one PER_UNIT line per published price cell, and estimate and
  evidence count exactly one of them from the request (the kling pattern):
  - `search`: `search` $0.005 (flash/fast/standard, `searchResults`),
    `answer` $0.006 (flash/fast/standard, `sourcedAnswer`/`structured`),
    `deep_search` $0.05, `deep_answer` $0.055.
  - `fetch`: `standard` $0.001, `standard_render_js` $0.005, `pro` $0.005,
    `pro_render_js` $0.01, plus `structured_output` $0.001 when `schema`
    is set.
  Responses carry no usage meter, so there is no `consolidate`: the derived
  fold is the bill. Linkup charges nothing on an error, matching the
  engine's zero-billed non-2xx.
- **Faithful mirrors.** Each `schema/inputs.ts` mirrors the OpenAPI request
  body (`SearchInput`, `FetchInput`) with optionality only, as a strict
  object, so a field that could move the price is never sent unpriced.
  The binding defaults are the price selectors the estimate reads:
  `depth` `standard` and `outputType` `searchResults` on `search`
  (Linkup requires both), `mode` `standard` and `renderJs` `false` on
  `fetch` (Linkup's documented defaults).
- **Errors.** A provider `output.fromError` digests
  `{error: {code, message, details}, statusCode}` into
  `{message, code?, raw}`.
- Real recordings (`deno task record`, trimmed): search `happy` (fast,
  `searchResults`), search `sourced-answer`, fetch `happy`, and a 401 per
  endpoint.

## Capabilities

- `linkup-connector`.

## Non-goals

- `/research` (asynchronous multi-minute research tasks) and `/tasks`
  (batch wrapper around the same calls) are not ported.
- `/extract` (closed beta) and `/credits/balance` (account plumbing) are not
  ported.

## Impact

New connector tree and 2 new ids in `connectors/ids.lock.json`. No new
`Unit`, preset, hook or category, and no compiler or engine change.
