# Proposal: add-connector-magic-hour

## Why

Magic Hour provides asynchronous AI media generation APIs. Adding its AI GIF
Generator gives Monid agents a prompt-to-animation endpoint with provider-
reported credit settlement and no new engine capability.

## What Changes

- Add the `magic-hour` provider with Bearer authentication, asynchronous image
  project polling, and settlement from `credits_charged`.
- Add `/v1/image/magic-hour-ai-gif`, which generates GIF, MP4, or WebM output
  from a prompt for 50 Magic Hour credits.

## Capabilities

- `magic-hour-connector`.

## Non-goals

- Additional Magic Hour image, video, and audio endpoints.
- Webhook delivery; this connector uses the documented project-status API.

## Impact

New connector tree only. No schema or engine changes.
