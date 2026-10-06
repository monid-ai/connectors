# Proposal: add-connector-string

## Why

String is our own web-access API: search the web and fetch any URL as clean,
LLM-ready content. Two JSON endpoints on one host, one bearer key, no new
engine capability — search settles a flat per-page rate, fetch settles one
of four output-determined rates read off a response header. Listing it here
reaches every Monid-integrated agent.

## What Changes

- **connectors/string** — 2 endpoints against
  `https://request.usestring.ai/v1`, bearer auth.
  - `POST /search`: `PER_UNIT`·`PAGE`, Growth-tier rate ($0.001/page).
    Without `searchCount` (1-300), always 1 page. With it, only the
    `google` engine pages further results (up to 36) to collect enough, and
    the estimate holds that 36-page cap; `duckduckgo`, `brave` and `mojeek`
    return one page. Evidence reads `paging.pages` when present, else 1.
  - `POST /fetch`: `COMPOSITE` of four `PER_UNIT`·`RESULT` components
    (`request_standard`, `request_premium`, `browser_standard`,
    `browser_premium`), each the Growth-tier rate for that class
    ($0.0002–$0.004). The billed class is OUTPUT-determined — named by the
    response header `x-billed-request-type`, not knowable from the request
    alone (the proxy-class axis is always the target site's own anti-bot
    posture). `jsonSchema` extraction is not exposed: its surcharge scales
    with page/schema size with no published flat rate.
- **A response header reaches `usage.evidence` via lifecycle state, not the
  declarative path.** The declarative `usage.evidence` envelope carries
  `input`/`output`/`lifecycle.state` — no response headers. `fetch` uses a
  single-tick `lifecycle.start` (no `poll`: `/fetch` is synchronous, no job
  id) that reads `x-billed-request-type` off the raw response and stashes it
  on `state.data.billedRequestType`, the documented billing-signal channel
  for a settled value read off `lifecycle?.state.data`. `evidence` reads
  that stashed value and settles the one matching component; a transport
  that doesn't surface response headers settles zero rather than guessing.
- **`shared/testing/fixtures.ts`** — `RECORDED_RES_HEADERS` gains
  `x-billed-request-type`, the one addition needed for a fixture to
  record/replay the header `fetch`'s billing depends on. Allowlisted, not a
  credential, no other connector's behavior changes.
- Fixtures are synthetic (`synthetic-` prefix), built from String's own
  published example responses — no API key was available while drafting.

## Capabilities

- `string-connector`.

## Non-goals

- `sitemap` and the rest of String's surface (a separate hosted MCP tool
  set beyond `search`/`fetch`) — a later change, not bundled here.
- Pricing String's plan tiers as separate credit pools. String bills in
  plan-tier USD with no vendor "credits" abstraction and no settle-time
  cost receipt on the response, so both endpoints quote the Growth tier as
  a fixed rate rather than modeling tier selection.
- `jsonSchema` structured-extraction pricing on `fetch` — no published flat
  rate to model; left unexposed rather than guessed.

## Impact

New connector tree, including its own connector-local `search`/`fetch`
input schemas; no new `Unit`, preset, or hook, and no shared schema
contract change — `ENGINE_VERSION` and `config.yml`'s `doc_format_since`
are untouched. One test-infra change: `RECORDED_RES_HEADERS` widens by
one entry.
