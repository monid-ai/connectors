# Proposal: add-connector-venice

## Why

[Venice](https://venice.ai) is a privacy-first AI inference API: chat across
~150 open and frontier models — Venice-hosted private models whose prompts
are never stored or logged, including uncensored ones, plus frontier models
proxied anonymized — embeddings, image generation, and zero-data-retention
web search / scrape. Submitted by the vendor.

It fills a gap in the catalog: no connector exposes general-purpose LLM
text generation today, so an agent on Monid has no way to delegate a
sub-task to a different model (a private one for sensitive context, an
uncensored one for content other models refuse, a cheaper one for bulk
work). Every endpoint here is a synchronous JSON POST, so nothing needs a
new engine capability.

## What Changes

- **connectors/venice** — provider (`presets.auth.bearer()` on
  `https://api.venice.ai/api/v1`, US-dollar pool, provider-level
  `usage.consolidate` and `output.fromError`) + 5 endpoints:
  `chat/completions`, `embeddings`, `image/generate`, `augment/search`,
  `augment/scrape`.
- **Vendor claim on chat.** `/chat/completions` reports its own charge on
  every response as `cost: {usd, diem}` (token prices for the chosen model,
  cached-token discounts, and any web search / scrape augmentation, as one
  number). The provider consolidate plucks it out of the payload and the
  claim wins (D27). Rather than pin a ~150-model token rate card that would
  drift weekly, the endpoint meters that same claim in nano-dollars
  (`Unit.CREDIT` at $0.000000001), so the derived fold equals the claim and
  `usage.mismatch.derived` stays silent. `diem` is Venice's staked-compute
  balance, priced 1:1 with USD; a request is charged in exactly one of the
  two, so the claim is their sum.
- **Bounded chat hold.** `max_completion_tokens` is REQUIRED at the
  binding (the primary limiting knob — D25). The estimate is a provable
  ceiling: input UTF-8 bytes at the highest published input rate
  ($12 / 1M), `max_completion_tokens` at the highest output rate ($60 / 1M),
  plus $0.01 per enabled augmentation. The settle trues down to the claim.
- **Pinned rate cards where Venice reports no cost.** `embeddings` is a
  COMPOSITE of five linear per-token lines, one per published price tier,
  read off `usage.prompt_tokens`; `image/generate` is a COMPOSITE of three
  per-image lines counted off `images.length`; `augment/search` and
  `augment/scrape` are flat PER_CALL $0.01. Rates from `GET /models` and the
  Venice price sheet, verified 2026-10-08.
- **Faithful mirrors, scoped.** Request bodies mirror Venice's schemas with
  optionality only; defaults live at the binding (`augment/search` `limit`
  10 and `search_provider` `brave`; `image/generate` `variants` 1).
  `image/generate` enumerates only FLAT-priced models (one price per image
  regardless of size or quality); resolution- and quality-tiered models are
  rejected at INVALID_INPUT rather than approximated.
- **Category** — new leaf `text-generation` in `connectors/categories.ts`
  (the GENERATIVE group, beside `image-generation`), since no existing leaf
  names an LLM completion. `chat/completions` also carries `ai-search` for
  its web-grounded mode.
- Real recorded fixtures as provider-level shared chains (8) with
  `{{request.url}}` bindings, plus replay, schema-gate and gated-live tests
  per endpoint.

## Capabilities

- `venice-connector`.

## Non-goals

- **Streaming** (`stream: true`) — the engine settles one envelope; an SSE
  body would arrive as an undecodable string.
- **E2EE chat** — needs client-side key exchange the engine cannot perform.
- **`/audio/speech`** and **`/video/retrieve`** — binary response bodies.
- **`/image/edit`**, **`/image/upscale`**, **`/audio/transcriptions`**,
  **`/augment/text-parser`** — image/file inputs (multipart or large
  base64), better as a follow-up once a concrete need exists.
- **Resolution/quality-tiered image models** (nano-banana, gpt-image,
  seedream-pro, …) — a follow-up with a per-resolution composite.
- **`/video/queue`** (async), **`/crypto/rpc`**, music — follow-ups.

## Impact

New connector tree, one new category leaf, five new ids in
`connectors/ids.lock.json`; no schema/engine/compiler changes — version
stays.
