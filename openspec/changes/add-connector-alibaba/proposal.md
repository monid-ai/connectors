# Proposal: add-connector-alibaba

## Why

Alibaba Cloud Model Studio (DashScope, Singapore) is a live v1 monid-services
provider: six Wan video-generation models (Wan 3.0 standard + prime, Wan 2.7
text-to-video / image-to-video / reference-to-video / video editing) and four
image models (Qwen-Image 3.0 pro + standard, Wan 2.7 Image pro + standard)
behind one Bearer key, with published USD rate cards.

It is the second MIXED-MODE provider after suzanne — six async submit→poll
video endpoints and four blocking image calls on one credential — and the
first whose blocking path must NOT carry a header the async path REQUIRES
(`X-DashScope-Async`), which exercises endpoint-level `request.headers`.

## What Changes

- **connectors/alibaba** — 10 endpoints pinned to v1's published ids
  (`/v1/video/wan3.0`, `…/wan3.0-prime`, `…/wan2.7-t2v`, `…/wan2.7-i2v`,
  `…/wan2.7-r2v`, `…/wan2.7-videoedit`, `/v1/image/qwen-image-3.0-pro`,
  `…/qwen-image-3.0`, `…/wan2.7-image-pro`, `…/wan2.7-image`), all sharing
  the provider's Bearer auth, dollar pool and task lifecycle; the four image
  endpoints override `start` with the blocking relay.
- **The input IS DashScope's wire body** (`{input, parameters}`; images
  `{input: {messages}, parameters}`), the pinned `model` injected by
  `input.toRequest` — the same posture the owner chose for kling (design D2).
  v1's flat monid shape and its `buildGenerationBody` assembly are not carried.
- **Rate cards are the Singapore LIST prices** (design D3): per-second
  `PER_UNIT`·`SECOND` lines per resolution for video, per-image `RESULT` lines
  for images (Qwen split by the 1K / 2K output tier plus an input-image line).
  wan3.0-video's "limited-time 30% off" is NOT modelled (owner decision).
- **No vendor claim** (design D4): DashScope reports quantities, never
  dollars, so the derived fold is the bill; fractional `usage.duration` is
  reported as-is and rounded UP by the engine's fold (owner decision).
- **Rate lines and tiers are keyed from the REQUEST** (design D5): the
  resolution, and for Qwen the `size` area — v1 stamped the tier from the
  response echo.
- **Synthetic fixtures**: ten shared chains built from the live API reference
  shapes — no Model Studio key was available for this port.

## Capabilities

- `alibaba-connector`.

## Non-goals

- **No `lifecycle.stop`.** DashScope cancel applies to PENDING tasks only;
  v1 declares `stoppable: false`.
- **No Asset Center `asset_id` inputs, no inline base64, no task list, no
  callbacks, no temporary upload** — account-surface operations v1 excluded
  (cross-tenant); media inputs are public `https://` URLs only.
- **No legacy models** (qwen-image-2.x, wan2.6 and earlier, HappyHorse,
  Z-Image) — outside v1's locked scope.
- **No `output.fromError`.** DashScope's error envelope carries `message` at
  the top level, and a failed task carries it on `output`; nothing to lift.
- **No CROSS-field input validation.** The many combination rules (frame
  vs reference exclusivity, per-type caps, r2v's 2-10 s with a video, Qwen's
  agent-mode-is-text-only, Wan Image's n vs image-set mode and 4K-is-T2I-only)
  live in `meta.notes`; DashScope rejects the combination itself, for free
  (design D9). Single-field constraints stay enforced.
- **No live recordings.** Replace the `synthetic-*` chains via
  `deno task record` once a key exists (tasks 7.1).

## Impact

New connector tree only. Connector-only: no engine bump, no new `Unit`, no new
preset, no hook-ABI change, no new category leaf (`video-generation` and
`image-generation` exist). The endpoint-level `request.headers` merge is an
existing compiler behavior used for the first time (design D6).
