# Tasks: add-connector-alibaba

## 1. Decisions (owner, 2026-09-16)

- [x] 1.1 Ids pinned to v1's `/v1/video/…` / `/v1/image/…` (D1)
- [x] 1.2 wan3.0-video at the Singapore LIST price, promo not modelled (D3)
- [x] 1.3 Fractional seconds reported verbatim, rounded UP by the fold (D4)
- [x] 1.4 Input = DashScope's wire body, `model` via `toRequest` (D2 — the
      kling decision applied; the owner did not answer this one explicitly)
- [x] 1.5 No key: synthetic fixtures (D12)

## 2. Provider

- [x] 2.1 `schema/dashscope.ts`: `zMediaUrl` (`pattern`), `zSeed`,
      `zPromptExtend`, `zWatermark`, `zNegativePrompt`, `zResolution`,
      `zWanRatio`, `zImageMessages`
- [x] 2.2 `provider.ts`: meta + 5 shared notes, bearer auth, baseUrl +
      `Accept`, video timeouts (D10), async `start` (envelope check, D7) /
      `poll` (D7), dollar pool, `output.fromResponse` token strip (D11)

## 3. Endpoints (10)

- [x] 3.1 `video-wan3-0` / `video-wan3-0-prime` — prompt|media union, 3
      lines, "auto" → -1, 5 notes
- [x] 3.2 `video-wan2-7-t2v` — 2 lines
- [x] 3.3 `video-wan2-7-i2v` — 2 lines, 2 notes
- [x] 3.4 `video-wan2-7-r2v` — 2 lines, input-cap fuse evidence, 4 notes
- [x] 3.5 `video-wan2-7-videoedit` — 2 lines, optional duration (10 s hold)
- [x] 3.6 `image-qwen-image-3-0-pro` — 3 lines (1K / 2K / input), `size`
      required, blocking `start` override
- [x] 3.7 `image-qwen-image-3-0` — 2 lines, same binding
- [x] 3.8 `image-wan2-7-image-pro` / `image-wan2-7-image` — leaf RESULT,
      derived hold, blocking `start` override
- [x] 3.9 Each video doc: `request.headers` `X-DashScope-Async` (D6),
      prefaulted `parameters` (D8), `toRequest` model injection (D2)

## 4. Verify the shape

- [x] 4.1 `compiler:compile` — 10 docs; fn sharing: one provider start, one
      image override, one poll, five video docs on one evidence entry
- [x] 4.2 `engine:estimate` — bare `{input: {prompt}}` ⇒ `{"720p": 5}`;
      "auto" 1080P ⇒ 30 s; videoedit no duration ⇒ 10 s; qwen 2048*2048 n 3
      + 2 images ⇒ 0.231; wan image set mode ⇒ 12; INVALID_INPUT on a bare
      `negative_prompt` (prompt|media union), `model`, `shot_type`, 480P on
      2.7, duration 16, `1024x1024`, two messages, 4K on the standard model,
      `data:` / `http://` URLs

## 5. Fixtures (synthetic)

- [x] 5.1 `synthetic-video-succeeded` (+ `-fractional`, `-r2v-input`),
      `synthetic-video-failed`, `synthetic-video-no-url`,
      `synthetic-poll-failed`, `synthetic-submit-rejected`,
      `synthetic-submit-envelope-error`, `synthetic-qwen-succeeded`,
      `synthetic-wan-image-succeeded` — shapes from the live reference
      pages, ids / urls placeholders

## 6. Tests

- [x] 6.1 `test-inputs.json` + `lifecycle.test.ts`: literal rate table whose
      key set equals the ten ids; video happy chain per model + resolution
      rows; fractional ceil; r2v fuse; failed / no-url / poll-503; rejected
      + envelope error on both paths; qwen tiers; wan image strip;
      estimates; 12 INVALID_INPUT gates; provenance (headers, timeouts,
      shared fns, no stop, no consolidate); live test gated on
      `ALIBABA_API_KEY`
- [x] 6.2 Red once (see the PR body)
- [x] 6.3 Verify: fmt · lint · check · test · double-compile (byte-identical)
      · version:check

## 7. Follow-ups (not in this change)

- [ ] 7.1 With a Model Studio key: `deno task record` the video, Qwen and
      Wan Image happy chains plus one rejection and replace the
      `synthetic-*` files; confirm `usage.duration` on wan2.7-i2v is an
      integer and whether r2v echoes the input side capped
- [ ] 7.2 Re-check the wan3.0-video "Limited-time 30% off" row against the
      account's actual bill; if the promo becomes permanent, D3 flips
- [ ] 7.3 Engine: `PER_UNIT` cannot bill a fractional quantity without
      rounding up (`ceil(q / every)`); DashScope bills fractional seconds.
      A fractional `every` or a "no rounding" flag would close the gap
- [ ] 7.4 Decide whether `resolution` should default to DashScope's 1080P
      rather than v1's 720P (D8)
