# Proposal: add-connector-kling

## Why

Kling (klingai.com) is a live v1 monid-services provider: twelve video
generation endpoints — text-to-video and image-to-video across Kling 3.0,
3.0 Turbo, 2.6 and 2.5 Turbo, multimodal generation and editing with 3.0 Omni
and O1, and motion transfer with 3.0 and 2.6 — behind one Bearer credential,
one async task API and a published per-second rate card in Kling units.

It is the second GENERATIVE video connector after bytedance, and it exercises
two things bytedance could not:

- a **vendor that reports its own meter** on the completed task (`billing[]`
  in units), so `usage.consolidate` carries a real claim and the derived fold
  becomes the always-on cross-check D27 designed — bytedance's Ark reports
  token counts only;
- a **rate that depends on THREE request facts** (resolution, the native-audio
  switch, and whether `contents[]` carried a video), including one model
  (motion control) with no requested duration at all, whose hold is a ceiling
  and whose bill is the generated seconds.

## What Changes

- **connectors/kling** — 12 endpoints, one per upstream model path
  (`text-to-video/kling-3.0`, `…/kling-3.0-turbo`, `…/kling-2.6`,
  `…/kling-2.5-turbo`, the same four under `image-to-video/`,
  `omni-video/kling-3.0-omni`, `omni-video/kling-o1`,
  `motion-control/kling-3.0`, `motion-control/kling-2.6`), all async, all
  sharing the provider's Bearer auth, timeouts, task lifecycle (`start`
  submit → `poll` the batch task query), Kling-units credit pool and
  `usage.consolidate` receipt claim + strip.
- **The input IS Kling's wire body** (owner decision 2026-09-16, design D2):
  `{prompt, settings}` for text-to-video, `{contents[], settings}` for the
  rest. v1's flat monid shape (`prompt` / `media[]` / `resolution` …) and its
  `toWire` assembly are not carried over; there is no `input.toRequest`.
- **The credit pool is Kling units** (owner decision, design D3): every rate
  line pins the published units-per-second (0.3 … 3.0); the $0.14/unit list
  conversion is the broker's.
- **`billing[]` is the vendor's claim** (owner decision, design D4): unit rows
  are summed into `credits.default`; a cash row forfeits the claim; the
  receipt is stripped from the output in the same motion.
- **Rate lines are chosen from the REQUEST** (design D5): each endpoint is a
  `COMPOSITE` of `PER_UNIT`·`SECOND` lines keyed `<resolution>`,
  `<resolution>_native_audio`, `<resolution>_with_video`; the estimate holds
  the requested seconds (motion control: the orientation ceiling), the
  evidence settles the generated seconds off `outputs[].duration`, rounded.
- **Synthetic fixtures**: eight shared chains built from the shapes v1's
  2026-09-08 drill recorded — no Kling key was available for this port.

## Capabilities

- `kling-connector`.

## Non-goals

- **No `lifecycle.stop`.** Kling exposes no cancel for a running task; v1
  declares `stoppable: false`.
- **No `element` / `voice` content items.** Both reference account-level
  asset libraries (Elements, custom voices) that any tenant could read — v1
  excluded them for that reason. Consequence: the 2.6 "native audio with
  voice control" rate row (1.2 units/s) is unreachable and has no line.
- **No `options`** (`callback_url`, `external_task_id`, `watermark_info`) —
  callbacks and watermarked outputs were never exposed in v1; `.strict()`
  keeps them out.
- **No legacy `/v1/videos/*` API, retiring 1.x/2.0/2.1 models, effects,
  try-on, lip-sync, avatar, audio or image families** — all outside v1's
  locked scope (`openspec/changes/add-kling-provider/proposal.md`).
- **No `output.fromError`.** Kling's error envelope and its failed task both
  carry `message` at the top level already; there is nothing to lift.
- **No CROSS-field input validation.** Kling's many combination rules
  (frame counts, 720p-no-native on 2.6, base-video exclusions, O1's 5|10
  with a lone first frame) have nowhere to compile to; they live in
  `meta.notes` and Kling rejects the combination itself, for free (design
  D9). Single-field constraints — enums, ranges, `.strict()`, the media-URL
  `pattern` — stay in the schema and ARE enforced before the wire.
- **No live recordings.** Replace the `synthetic-*` chains with
  `deno task record` output once a key exists (tasks 7.1).

## Impact

New connector tree only. Connector-only: no engine bump, no new `Unit`
(`SECOND` exists), no new preset, no hook-ABI change, no new category leaf
(`video-generation` exists). The `.prefault({})` binding on `settings`
(design D8) is a new authoring construct with no compiler impact.
