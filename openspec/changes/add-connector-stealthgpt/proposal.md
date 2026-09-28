# Proposal: add-connector-stealthgpt

## Why

Monid's connector catalog has no text-generation or AI-detection provider
yet. StealthGPT covers both: it humanizes AI-written text, generates content
from a prompt (`rephrase: false`), runs a multi-step Stealth Agent for
long-form academic, SEO and social content, and scores text for AI
detection. It has a wide user base, many use cases, has published documentation 
(`docs.stealthgpt.ai`), one `api-token` header,
a published per-word rate card, and a word meter on every response.

## What Changes

- **connectors/stealthgpt**: 4 endpoints against `https://www.stealthgpt.ai`,
  `api-token` header auth with the standard `{apiKey}` credential
  (`STEALTHGPT_CREDENTIALS_API_KEY`), one credit pool, a provider-level
  `output.fromError` over `{message, info?}` and `{error: {code, message}}`,
  no provider lifecycle.
  - Sync: `api/stealthify` (Writer & Humanizer) and `api/stealthify/detect`
    (AI Detector).
  - Async: `api/stealthify/runs` (Humanizer run) and
    `api/stealthify/agent/runs` (Stealth Agent). The submit answers
    `202 {runId, status, statusUrl}`; the lifecycle polls `statusUrl` to a
    terminal status so one run returns the finished result. The two
    lifecycles are byte-identical and intern to one fn per phase. Every
    submit carries `idempotency-key: {runId}:submit`.
- **The pool is StealthGPT's word balance** ("Stealth API words", $0.20 per
  1,000 pay-as-you-go). Every response reports the words charged
  (`wordsSpent`, or `creditsSpent` on runs); every endpoint is a leaf
  `PER_UNIT` in `CREDIT` units at amount 1, the provider evidence counts
  the reported words and the consolidate claims the same number (D27),
  stripping the meter and the account fields (`remainingCredits`,
  `billingMode`, `meteredChargedCredits`) from the output. No `Unit.WORD`
  exists; `CREDIT` is the vendor's own spelling (`creditsSpent`,
  `remainingCredits`).
- **Estimates** (D24/D25): detector = input words; writer endpoints = input
  words scaled by the published price ratio (`super` $0.05/100 is 2.5× the
  $0.20/1,000 base), the floor of a charge that adds output words; Stealth
  Agent = 0, since it is billed `ceil(outputWords × 10)` and nothing bounds
  the output. `model` is required on both writer endpoints as the price
  selector.
- **Strict mirrors.** Not exposed: `business` (removed), `detector` and
  `mode` (deprecated) on the sync writer; `webhookUrl`/`webhookSecret` on
  the runs (the engine polls).
- **Two category leaves**: `text-generation` and `ai-detection`.
- 13 fixture chains (7 recorded against the provider key, with ids and
  `remainingCredits` replaced by placeholders; 6 synthetic for states that
  cannot be induced) and 29 replay tests.

## Capabilities

- `stealthgpt-connector`.

## Non-goals

- `GET /api/stealthify/balance`: reports the platform account's balance.
- Synchronous `POST /api/stealthify/agent`: the async route covers it and
  is the one the docs recommend for integrations.
- The multipart file upload on `/api/stealthify/runs`.
- Webhooks.
- The MCP server (`/api/mcp/mcp`): its tools map onto the endpoints here:
  `generate_content` → `api/stealthify/agent/runs`, `humanize_text` →
  `api/stealthify/runs`, `get_run_status` → the engine's poll.

## Impact

New connector tree plus two category leaves. No new `Unit`, preset, hook or
compiler change; no engine bump (`deno task version:check` clean).
Double-compile is byte-identical.
