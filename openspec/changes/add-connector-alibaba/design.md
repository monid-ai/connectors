# Design: add-connector-alibaba

Decision record for the Alibaba Model Studio (DashScope) port. v1 source:
`monid-services/services/shared/providers/adaptors/alibaba/` (+
`openspec/changes/add-alibaba-provider/proposal.md`, no v1 design.md).
Precedents: bytedance (request-keyed COMPOSITE per-second lines), suzanne
(mixed async / sync provider layout), minimax (blocking relay with an
envelope check, internal-counter strip), kling (nested selector defaults).

## D1 — One endpoint per model; ids pinned to v1's (owner, 2026-09-16)

All six Wan video models post to ONE create-task path and all four image
models to ONE blocking path, so the derived `?? request.path` identity would
collide. The owner chose v1's published ids over bytedance-style short names
(the minimax precedent: v1 model-name ids kept verbatim):

| folder | `endpoint` | id |
| --- | --- | --- |
| `video-wan3-0` | `/v1/video/wan3.0` | `alibaba#v1/video/wan3.0` |
| `video-wan2-7-videoedit` | `/v1/video/wan2.7-videoedit` | `alibaba#v1/video/wan2.7-videoedit` |
| `image-qwen-image-3-0-pro` | `/v1/image/qwen-image-3.0-pro` | `alibaba#v1/image/qwen-image-3.0-pro` |
| `image-wan2-7-image` | `/v1/image/wan2.7-image` | `alibaba#v1/image/wan2.7-image` |

The pinned upstream `model` id (`wan3.0-video`, `qwen-image-3.0-pro`, …) is
never caller-supplied — the endpoint IS the model.

## D2 — The input is DashScope's wire body; `model` and `-1` ride `toRequest`

Same decision class as kling D2 (the owner picked the vendor's own shape;
the port applies it here): the mirror is DashScope's `{input, parameters}`
envelope, and for the image models `{input: {messages: [{role, content:
[{image}|{text}]}]}, parameters}` — verbose, but the vendor's fact. v1's flat
`prompt` / `media[]` / `resolution` input and its `buildGenerationBody` /
`buildImageGenerationBody` assembly are gone.

`input.toRequest` does exactly two wire things (bytedance D8): it injects the
pinned `model` with `utils.json.merge`, and on Wan 3.0 it translates OUR
`duration: "auto"` into DashScope's `-1` smart-duration sentinel — publishing
a named mode keeps the schema self-describing and keeps a bad `-5` out of
range instead of next door to the sentinel. `merge` is deep, so only
`parameters.duration` is replaced.

Consequence: the "which line" facts the fns need (`parameters.resolution`,
`parameters.size`, the image items in `content[]`) are read straight off the
typed input — v1 needed a submit-time stash and, for Qwen, a poll-time stamp.

## D3 — The pool is US dollars at the Singapore LIST price (owner, 2026-09-16)

Model Studio publishes every international rate in USD, so the pool is
dollars (bytedance / minimax). Amounts are the Singapore list rows of
https://www.alibabacloud.com/help/en/model-studio/model-pricing read
2026-09-16 (identical to v1's 2026-08-28 capture): wan3.0-video 0.05 / 0.10 /
0.20 per second at 480P / 720P / 1080P, wan3.0-video-prime 0.068 / 0.14 /
0.28, every wan2.7 video model 0.10 / 0.15 at 720P / 1080P, qwen-image-3.0-pro
0.04 (1K) / 0.075 (2K) per output image + 0.003 per input image,
qwen-image-3.0 0.03 + 0.003, wan2.7-image-pro 0.075 and wan2.7-image 0.03 per
image.

wan3.0-video is marked "Limited-time 30% off" with no published end date.
v1 charged list and recorded the discounted spend as internal cost
(`upstreamCostFactor: 0.7`). The owner chose LIST for v2's `amount`: the
promo is not modelled, the note on the endpoint says so, and tasks 7.2 asks
for a re-check. This is a deliberate deviation from the "amount = what we
actually pay" posture, recorded here.

## D4 — No vendor claim; fractional seconds round UP (owner, 2026-09-16)

DashScope's task and image envelopes report QUANTITIES (`usage.duration`,
`output_image_count`, `image_count`) but never a dollar figure, so
`usage.consolidate` is not written (minimax D2): the derived fold IS the
bill, there is no per-run `usage.mismatch.derived`, and the rates are pinned
by the literal table in `lifecycle.test.ts`.

`usage.duration` is a float on wan3 and videoedit (the videoedit reference
page shows `10.04 = 5.02 + 5.02`). The engine's fold is
`ceil(quantity / every) × amount`, so a fractional count bills the next whole
second — at most one second (US$0.15) over what DashScope charges, never
under. The owner chose that over rounding in the evidence (which would
under-bill half the time) and over an engine change. The evidence reports
the vendor's figure verbatim; the rounding is the fold's, visible to anyone
re-deriving the bill. Follow-up 7.3 notes the engine gap.

## D5 — Request-keyed lines: resolution for video, `size` area for Qwen

Video: each endpoint is a `COMPOSITE` of `PER_UNIT`·`SECOND` lines keyed
`480p` / `720p` / `1080p`; the fns put the seconds on the line
`parameters.resolution` selects (lower-cased). The basis is DashScope's own
`usage.duration` — "used for billing", input + output seconds where the model
bills input (wan3, videoedit) — except wan2.7-r2v, which settles
`output_video_duration + min(input_video_duration, 5)` from the component
fields: DashScope documents a 5 s cap on the billed input side, and deriving
the sum means a reported-but-uncapped echo can never overcharge (v1's
`wanBilledSeconds` fuse; drill T3 2026-09-01 found the vendor caps its echo
too). The estimate holds the requested OUTPUT seconds only (v1 decision A1:
a reference clip's length is unknowable before the run; input seconds settle
over the hold), `"auto"` holds the 30 s ceiling, and an omitted videoedit
duration (keep the source length) holds 10 s.

Qwen: `output_image_1k` / `output_image_2k` (pro) or `output_image`
(standard) plus `input_image`. The tier is DashScope's own boundary — at most
2,250,000 px is 1K — applied to the REQUESTED `size`, which is therefore
required at the binding (v1 decision D2). v1 stamped `billable_1k_images`
from the response's `output_image_type` echo; the request cannot drift
(bytedance D4). Counts come from `usage.output_image_count` (blocked images
are omitted upstream) and `usage.input_image_count`.

Wan Image: a leaf `PER_UNIT`·`RESULT`; the hold is `n`, or DashScope's own
default when omitted (12 in image-set mode, 1 otherwise — v1
`wanImageHoldCount`), the settle is `usage.image_count`.

Consequence: every video and Qwen endpoint has ≥2 metered lines, so
estimate + evidence are DOC-level; identical source interns (five video
evidence fns are one entry, r2v's stands alone; the two Wan Image docs share
one estimate and one evidence).

## D6 — Mixed lifecycle: the provider is the async majority; images override `start`

Suzanne D3 applied: `resolve()` only falls back, so the provider states the
majority — the async video submit and its poll (6 of 10) — and the four image
endpoints override `start` with the blocking relay (minimax's `start`
shape). The image docs therefore also resolve `poll` and carry an inert
`timeouts.pollMs` (their `start` always COMPLETES); one unused fn ref beats
weakening the contract check on a paid path. Four identical overrides intern
to ONE fnTable entry.

The async path REQUIRES `X-DashScope-Async: enable` and the blocking path
must NOT carry it (it would turn the call into a task submission), so the
header is declared per VIDEO endpoint in `request.headers` — the compiler
merges provider and endpoint headers, so the provider's `Accept` still rides
along. This is the first endpoint-level `request.headers` in the repo; no
compiler change was needed.

## D7 — Envelope errors on 2xx are a synthesized 502; poll non-2xx throws

DashScope's error envelope is `{code, message, request_id}` with a NON-EMPTY
string `code`, and the intl docs never pin the HTTP status of every error
class, so both `start` fns check a 2xx for it and synthesize 502 with
`providerHttpStatus` = the vendor's (v1 checked the image path only; the
video submit now too — a 200-shaped failure must never park a run). A clean
2xx without `output.task_id` throws `retriable: false`.

Poll: a non-2xx on OUR GET throws (bytedance D7 — no cancel, so an abandoned
task keeps billing). `PENDING` / `RUNNING` / anything unknown stays RUNNING
(minimax D7a); `FAILED` / `CANCELED` / `UNKNOWN` (the task expired or was
evicted, terminal either way) synthesize 500; `SUCCEEDED` without
`output.video_url` synthesizes 502. The COMPLETED output is the task
envelope verbatim — its `usage` is the billing basis the caller can check.

## D8 — Nested selector defaults; 720P is v1's deliberate default

The price selectors live one level down in `parameters`, which DashScope
marks optional, so the binding prefaults `parameters` to `{}` with nested
defaults (kling D8): `resolution` and `duration` on every video model except
videoedit, whose omitted duration means "keep the source length" upstream and
stays optional; `n` on Qwen (DashScope's default 1) with `size` required.
Wan Image needs no binding default — `n`'s upstream default depends on
`enable_sequential`, so the estimate derives it.

`resolution` defaults to **720P**, not DashScope's own **1080P**. This
deviates from the D25 rule (a binding default mirrors the vendor's default)
on purpose: v1's proposal locked "our schema defaults resolution to 720P
(upstream defaults to 1080P, the most expensive tier)" (decision B2), and the
default materializes onto the wire so DashScope receives exactly what the doc
says. The describe on every `resolution` field states both facts. Flip it to
1080P if the owner prefers the vendor default over v1's product choice.

## D9 — Cross-field rules move to `meta.notes`; the mirror follows LIVE docs

v1 enforced eleven `superRefine` rules (prompt-or-media, frame vs reference
exclusivity, file vs link, per-type caps, i2v's one-of first_frame /
first_clip and driving_audio-only-with-first_frame, r2v's ≥1 reference /
≤5 combined / 2-10 s with a video, videoedit's exactly-one-video / ≤4
references, Wan Image's n ≤ 4 outside set mode and 4K-is-T2I-only, Qwen's
size area and agent-mode-is-T2I-only). None compile (bytedance D6); each is a
note on the endpoint it binds and DashScope rejects the combination for free.
The one vendor rule that IS expressible — Wan 3.0's "prompt or media" — is
the union `z.union([zInput.required({prompt}), zInput.required({media})])`
(surf D4), and single-field rules stay enforced (`.strict()`, enums, ranges,
the media-URL `pattern`, Qwen's `size` regex, `messages.length(1)`).

The mirrors were diffed against the live reference pages (2026-09-16); where
they differ from v1, live wins:

| field | v1 | live |
| --- | --- | --- |
| Qwen `size` | required in the schema | optional upstream (model recommends); REQUIRED at the binding for the tier |
| videoedit `duration` | optional, omit = keep source | default `0` sentinel = keep source; omit instead (the `0` is not mirrored) |
| wan3 `seed` | 0-2147483647 | -1 or 0-2147483647 (-1 = random) |
| wan3 `duration` with a video input | 2-30 | input + output ≤ 30 (note) |
| i2v `first_clip` | 2-10 s | 2-10 s (same); output aspect follows the input |
| r2v `reference_video` | 1-30 s | 1-30 s (same); `ratio` ignored with a first_frame |
| t2v `shot_type` | absent | present for legacy 2.6 only, no effect on 2.7 — not mirrored |
| Wan Image `size` | `1K`/`2K`/`4K` or `W*H` | same; 4K T2I-only, W*H 768-4096 (pro) / 768-2048 |

## D10 — Timeouts carry v1's values

Video (the provider default): `requestMs: 30_000`, `runMs: 1_800_000`
(the slowest documented generations run ~17 min), `pollMs: 30_000`. Image
(endpoint-level): `requestMs: 600_000`, `runMs: 660_000` — the blocking call
IS the run (v1 decision C1; image sets run minutes).

## D11 — `output.fromResponse` strips the Wan Image token counters

The Wan 2.7 Image envelope carries `usage.input_tokens` / `output_tokens` /
`total_tokens`, which DashScope documents as "not billed. Billing is based on
the number of images" — provider-internal accounting noise v1 stripped in
`providerFormatOutput`. Kept, as a provider-level `output.fromResponse` with
`utils.json.omit` (the minimax precedent for internal token counts): it runs
after `usage.evidence`, so it can never touch a bill, and the three keys
occur in no other DashScope envelope. Every billing basis stays visible:
`usage.duration` and its components (video), `output_image_count` /
`input_image_count` / `output_image_type` (Qwen), `image_count` / `size`
(Wan Image).

## D12 — Fixtures are synthetic

No Model Studio key was available, so the ten chains are hand-built from the
response shapes the live reference pages document (submit
`{output: {task_status: "PENDING", task_id}}`, the task envelope with
`output.video_url` and `usage`, the videoedit page's verbatim fractional
usage, the Qwen six-counter usage, the Wan Image envelope with `finished` and
the token counters, the `{code, message, request_id}` error envelope). The
r2v-input chain (an 8 s reference clip echoed uncapped) is hypothetical by
construction — the drill saw the vendor cap its echo — and exists to pin the
fuse. None have seen live traffic; the PR says so.
