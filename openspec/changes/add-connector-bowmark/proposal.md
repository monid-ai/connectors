# Proposal: add-connector-bowmark

## Why

Bowmark (bowmark.ai) turns live websites into a typed JavaScript library an
agent calls from code: current prices and stock, search results behind
filters, insurance and shipping quotes, booking availability, anything
behind a form. It fills the gap between search/scrape providers (which read
a page) and a hosted browser agent (slow, expensive): the agent asks for
the functions a task needs, then runs a short script against them.

The surface is two synchronous JSON endpoints, Bearer auth, no new engine
capability.

## What Changes

- **connectors/bowmark**: 2 endpoints, `presets.auth.bearer()`, base URL
  `https://api.bowmark.ai/v1/monid` (`monid` is Bowmark's attribution
  segment for this listing; `/v1/library` and `/v1/run` answer identically).
  - `bowmark#library` (`GET /library`, `Accept: application/json`): the
    functions, argument types and examples that cover a task or a site, as
    Markdown in `library`. FREE: a library read touches no website.
  - `bowmark#run` (`POST /run`, body `{script}`): runs the script on
    Bowmark's machines and returns the run envelope
    `{ok, status, result, logs, error, ms, runId}`. Synchronous; Bowmark
    holds the request until the run ends (its ceiling is 120 s), so the
    timeouts are 130 s / 135 s.
- **One credit pool** `default` ("US dollars"). `run` is PER_UNIT RESULT at
  a pinned $0.04 per run that returned a result (`status` ok or partial);
  an `error` run, a `needs_user` pause and every non-2xx bill 0. No
  `usage.consolidate`: Bowmark's envelope deliberately carries no price
  (design D2).
- **New category leaf** `web-automation` ("Operate live websites from code").
  None of the existing leaves covers operating a site (filters, forms,
  quotes) as opposed to reading or searching one.
- Fixtures are RECORDED (2026-10-10, live API): a library read, a happy
  run, a run whose script threw (HTTP 200, status error), and a 401 on an
  invalid key. The account-specific `notice` field and route `notes` were
  removed from the recorded bodies.

## Capabilities

- `bowmark-connector`.

## Non-goals

- The repeated `?query=` form of `/library` (several lookups in one call).
- Bowmark's `needs_user` sign-in relay. A run that needs the account owner
  signed in returns `meta.handoff.url` for a human; Monid callers get it as
  data and the run bills 0.
- Bowmark's session loop (`/v1/session/*`) and MCP surface.

## Impact

New connector tree plus one new category leaf. No schema/engine contract
change: `ENGINE_VERSION` unchanged, no new `Unit`, preset or hook.
