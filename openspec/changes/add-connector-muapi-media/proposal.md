# Proposal: add-connector-muapi-media

## Why

MuAPI exposes several current, high-value media models behind one API key.
Monid already has direct connectors for several other vendors, but it does
not yet offer Google's Nano Banana 2 image generation/editing or Veo 3.1
video generation through MuAPI. These models are a better durable fit than
the previously proposed Seedance-only integration: Monid's maintainers said
they are an official Seedance partner and closed that PR for policy reasons.

## What Changes

- Add `connectors/muapi` with `x-api-key` auth, the
  `api.muapi.ai/api/v1` base URL, and a shared asynchronous submit/poll
  lifecycle.
- Add `muapi#nano-banana-2` for text-to-image generation.
- Add `muapi#nano-banana-2-edit` for instruction-based image editing with
  one to fourteen reference image URLs.
- Add `muapi#veo3.1-text-to-video` for eight-second Veo 3.1 text-to-video
  generation at 720p, 1080p, or 4K.
- Declare the current published USD cards for each model family and select
  the matching rate line from the validated request.
- Consolidate MuAPI's successful `cost.amount_usd` claim while removing the
  billing object from user-facing output; failed generations settle with
  empty usage.
- Add synthetic replay fixtures, lifecycle tests, and input/estimate tests.

## Non-goals

- Do not add Sora 2; it is not a durable target for this connector.
- Do not add every MuAPI model in this change. Each additional model needs
  its own reviewed input schema, capability notes, endpoint identity, and
  rate evidence.
- Do not make live generation requests during tests or CI.
- Do not add a live pricing-drift service; MuAPI's successful vendor cost is
  the settlement source of truth and the pinned card is the public estimate.

## Impact

New connector and OpenSpec files only. Existing image-generation and
video-generation categories, lifecycle contracts, compiler behavior, and
usage units are reused; no engine or schema change is required.
