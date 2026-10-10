# Proposal: add-connector-goaimoat

## Why

GoAI Moat (goaimoat.com) builds tools that make brands visible to AI.
Its AI Visibility Audit endpoint checks whether a brand is mentioned,
cited, and described correctly in AI answers (ChatGPT, Perplexity, Google
AI Overview, Amazon Rufus), then returns a tier, a 30-point checklist, and
a fix-priority plan. This is the first goaimoat connector — a single POST
endpoint, free today, with `X-API-Key` auth. It is the reference shape for
future goaimoat endpoints on Monid.

## What Changes

- **connectors/goaimoat** — `provider.ts` (`X-API-Key` header auth,
  baseUrl `https://mcp.goaimoat.com`, `UsageModelKind.FREE`, timeouts
  30 s / 60 s) and one POST endpoint `/api/audit`.
  - Input schema: `brand_name` (required string), `category` (optional),
    `score` (optional int 0–30).
  - Fixtures are recorded responses (no live key is held in this repo).
- **Categories:** `geo` leaf.

## Capabilities

- `goaimoat-connector`.

## Non-goals

- No live traffic; fixtures are recorded responses, not live recordings.
- No dollar pricing in the doc — the audit is free (0 credits) today.
- No deep-audit playbook here; the full product lives at goaimoat.com.

## Impact

New connector tree, `openspec/changes/add-connector-goaimoat`.
No schema/engine contract change.
