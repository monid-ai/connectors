# Tasks: add-connector-kling

## 1. Decisions (owner, 2026-09-16)

- [x] 1.1 Pool = Kling units (D3)
- [x] 1.2 `billing[]` = the vendor claim, stripped (D4)
- [x] 1.3 Input = Kling's wire body, no `toRequest` (D2)
- [x] 1.4 No key: synthetic fixtures (D12)

## 2. Provider

- [x] 2.1 `schema/video.ts`: shared mirror fragments — `zMediaUrl`
      (`pattern`), `promptItem`, `zResolution`, `zAspectRatio`,
      `zDurationRange`, `zDurationChoice`, `zNativeAudio`, `zMultiShot`
- [x] 2.2 `provider.ts`: meta + 5 shared notes, bearer auth, baseUrl,
      timeouts (D10), `lifecycle.start` (envelope check, D6) / `poll` (batch
      query, D7), Kling-units pool, `usage.consolidate` receipt claim +
      strip (D4)

## 3. Endpoints (12)

- [x] 3.1 `text-to-video-kling-3-0` — 720p/1080p/4k × audio, 6 lines, 3-15 s
- [x] 3.2 `text-to-video-kling-3-0-turbo` — 720p/1080p, 2 lines, 3-15 s
- [x] 3.3 `text-to-video-kling-2-6` — 720p/1080p + 1080p native, 3 lines, 5|10
- [x] 3.4 `text-to-video-kling-2-5-turbo` — 720p/1080p, 2 lines, 5|10
- [x] 3.5 `image-to-video-kling-3-0` — as 3.1, `contents[]` with frames
- [x] 3.6 `image-to-video-kling-3-0-turbo` — as 3.2, first_frame only
- [x] 3.7 `image-to-video-kling-2-6` — as 3.3, frames (1080p rule noted)
- [x] 3.8 `image-to-video-kling-2-5-turbo` — as 3.4, frames (1080p rule noted)
- [x] 3.9 `omni-video-kling-3-0-omni` — 9 lines (res × audio × video), 7 notes
- [x] 3.10 `omni-video-kling-o1` — 4 lines (res × video), 3-10 s, 6 notes
- [x] 3.11 `motion-control-kling-3-0` — 2 lines, orientation-ceiling hold
- [x] 3.12 `motion-control-kling-2-6` — 2 lines, orientation-ceiling hold
- [x] 3.13 Each: prefaulted `settings` binding (D8), doc-level `estimate` +
      `evidence` keyed from the request (D5)

## 4. Verify the shape

- [x] 4.1 `compiler:compile` — 12 docs, 14 new fnTable entries; zero input
      fields without a description
- [x] 4.2 `engine:estimate` — bare `{prompt}` ⇒ `{"720p": 5}` (nested
      defaults materialize); 4k+native×15 ⇒ 45; omni base_video 1080p×10 ⇒
      12; motion image ⇒ 10 s hold; INVALID_INPUT on duration 7 (2.6),
      `http://` url, missing motion `settings`

## 5. Fixtures (synthetic)

- [x] 5.1 `synthetic-task-succeeded` (empty receipt — the shared fold chain),
      `-billed` (unit row "3"), `-cash` (cash row), `synthetic-task-failed`,
      `synthetic-task-no-video-url`, `synthetic-submit-rejected` (400/1201),
      `synthetic-submit-envelope-error` (200/1102), `synthetic-poll-failed`
      (503) — shapes from v1's 2026-09-08 drill, ids/urls placeholders

## 6. Tests

- [x] 6.1 `test-inputs.json` + `lifecycle.test.ts`: literal rate table whose
      key set equals the twelve ids; happy chain per endpoint; 15
      request-keyed line rows; claim wins + mismatch; cash forfeits; failed /
      no-url / rejected / envelope-error / poll-503; estimates; 12
      INVALID_INPUT gates; provenance (one start/poll/consolidate, interned
      quantity fns); live test gated on `KLING_API_KEY`
- [x] 6.2 Red once: 0.6 → 0.7 on 3.0 t2v reddened the rate table; a
      `$.billings` typo reddened the claim test; removing the `failed` branch
      reddened the failure test
- [x] 6.3 Verify: fmt · lint · check · test · double-compile (byte-identical)
      · version:check

## 7. Follow-ups (not in this change)

- [ ] 7.1 With a Kling key: `deno task record` the happy, rejected and
      failed chains and replace the `synthetic-*` files; confirm the
      `billing[]` row shape and whether `data[0]` ever lags the submit
- [ ] 7.2 v1 drill 2026-09-08 saw 32.1 units over 10 tasks; re-drill one task
      per family to re-confirm the rate rows against the live receipt
- [ ] 7.3 A failed task's submit is free on Kling, so no v2 gap here; but a
      run abandoned by the host after submit still bills upstream (no cancel)
      and that charge is invisible to the engine — same class as surf D3
