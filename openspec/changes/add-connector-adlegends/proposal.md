# Proposal: add-connector-adlegends

## Why

Ad Legends (adlegends.ai) asked Monid to take a connector PR after
application. Its public agent surface is hosted MCP over HTTPS
(`POST https://www.adlegends.ai/api/mcp/brands`) — Brand Memory, Fast Ads,
audiences, campaigns — not a classic OpenAPI REST catalog. Agents must
call `get_started` first. The connector wraps that real surface as Monid
endpoints rather than inventing a fake REST API.

Nothing about it needs a new engine capability: one host, Bearer API key,
one JSON-RPC envelope, synchronous `tools/call`. Legend Credits exist but
are not published as a stable wire meter, so usage is an honest FREE model
with published prices in `meta.notes` only (D26/D27/D29).

## What Changes

- **connectors/adlegends** — 11 endpoints against
  `https://www.adlegends.ai/api/mcp/brands`, bearer auth
  (`ADLEGENDS_CREDENTIALS_API_KEY` / `ADLEGENDS_API_KEY`), inheriting the
  provider's FREE model, MCP `fromResponse` / `fromError`, and a
  provider-level `lifecycle.start` that relays the compiled POST and
  synthesizes JSON-RPC / `result.isError` on HTTP 200 as COMPLETED 400.
  - Account: `get_started`, `whoami`, `get_credit_status`.
  - Brands: `list_brands`, `get_brand`, `get_brand_memory`,
    `create_brand_from_url`, `create_manual_brand`.
  - Fast Ads: `create_ads`, `get_ad_session`, `list_ad_sessions`.
- **Shared wire path, explicit identities.** Every tool is
  `POST /api/mcp/brands`. Each def declares `endpoint: "/<tool>"` so
  identities are `adlegends#get_started` (design D22 — shared path would
  otherwise collide).
- **Faithful MCP mirrors.** `schema/inputs.ts` mirrors the hosted
  `tools/list` argument schemas (optionality only, no `.default()`).
  `input.toRequest` wraps the validated body as JSON-RPC
  `{method:"tools/call", params:{name, arguments}}`.
- **No new category leaves.** Existing `agents` and `image-generation`
  cover Brand Memory / agent tools and Fast Ads image sessions.
- **Synthetic fixtures** (no live key held): provider-level shared chains
  for tool-ok, JSON-RPC error, tool `isError`, and 401 Bearer missing.

## Capabilities

- `adlegends-connector`.

## Non-goals

- The rest of the hosted MCP catalog (video, Cold Open, media plans,
  audiences, strategies, design-system import/export, resize, animation).
  Highest-value tools ship first; more tools are a later change.
- OAuth for chat clients. This connector documents the scoped Bearer key
  from `/settings/mcp` (the CLI/script convention).
- A Legend Credit rate card. No stable wire meter; FREE until one exists.
- A new `advertising-creative` leaf. `image-generation` + `agents` fit.
- No schema / engine contract change; `ENGINE_VERSION` untouched.

## Impact

New connector tree + OpenSpec change. No new `Unit`, preset, hook, or
compiler change.
