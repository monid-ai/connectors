# Proposal: add-connector-scam-ai

## Why

Scam.ai provides AI-content detection as an API: one synchronous endpoint
scores images, video, audio, and documents and answers a verdict with a
calibrated score. Adding it gives Monid agents media-authenticity checks —
screening attachments, verifying interview recordings, checking claim photos —
with provider-reported credit settlement and no new engine capability.

## What Changes

- Add the `scam-ai` provider with `x-api-key` header authentication, one
  credit pool (`default`), and settlement from the response's own
  `credits_used` meter.
- Add `/v1/detections`, which scores a public https:// media URL and returns
  verdict, score, summary, and media metadata; media type is inferred
  server-side, and the rate card is media-dependent (image 1 credit, video 1
  per sampled frame capped at 20, audio 1 per minute, documents 2 per page).
- Add the `ai-detection` leaf category; no existing leaf covers
  detection/authenticity tooling.

## Capabilities

- `scam-ai-connector`.

## Non-goals

- Multipart file upload: the engine transport speaks JSON, so this connector
  takes public URLs only; direct upload stays with the native API and SDKs.
- Additional Scam.ai endpoints (credit balance, usage reads).

## Impact

New connector tree plus one leaf category in `connectors/categories.ts`. No
schema or engine changes.
