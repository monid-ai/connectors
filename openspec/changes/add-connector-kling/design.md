# Design: add-connector-kling

Decision record for the Kling port. v1 source:
`monid-services/services/shared/providers/adaptors/kling/` (+
`openspec/changes/add-kling-provider/proposal.md`, no v1 design.md).
Precedent: bytedance (provider-level async lifecycle, one endpoint per model,
request-keyed COMPOSITE rate lines).

## D1 — One endpoint per upstream model path; the id IS the path

Carried over from v1 (the Alibaba Wan `-t2v` / `-i2v` convention): Kling
routes by `POST /<family>/<model>`, models differ in CAPABILITY (2.6 has no
4K, Turbo has no audio switch, O1 has no native audio), so a `model` input
would let a caller ask one rate card for another model's output.

Unlike bytedance, every Kling endpoint has its OWN wire path, so the derived
`?? request.path` identity is unique and nothing is pinned:

| folder | id |
| --- | --- |
| `text-to-video-kling-3-0` | `kling#text-to-video/kling-3.0` |
| `image-to-video-kling-2-5-turbo` | `kling#image-to-video/kling-2.5-turbo` |
| `omni-video-kling-o1` | `kling#omni-video/kling-o1` |
| `motion-control-kling-2-6` | `kling#motion-control/kling-2.6` |

Folders are the wire path with slashes and dots turned into hyphens (the
surf rule — mechanically unique, no group directories needed for twelve).
v1's `/v1/video/kling-3.0-t2v` ids are not carried: the wire path is the
identity this repo derives, and there is nothing to pin.

## D2 — The input is Kling's wire body, not v1's flat shape (owner, 2026-09-16)

v1 published a monid-invented flat input (`prompt`, `media[{type,url}]`,
`resolution`, `duration`, `audio`, `multi_shot`, `character_orientation`)
and assembled Kling's `{contents[], settings{}}` in `toWire`. The mirror rule
(D25) says `schema/inputs.ts` mirrors the VENDOR's current docs, and the owner
chose that over v1 compatibility: the published doc now reads like Kling's
own — `{prompt, settings}` for text-to-video, `{contents[], settings}` for
image-to-video, omni and motion control — and there is no `input.toRequest`
at all. Cost, stated: a caller migrating from v1 changes their body shape.

Consequences that fell out:

- the "with video input" price dimension is read straight off
  `contents[].type` (`feature_video` | `base_video`) in the estimate and
  evidence fns — v1 needed a submit-time stash and a poll-time stamp
  (`billed_seconds.<row>`) because its `PER_UNIT_MATRIX` selector could only
  read a top-level input field;
- the omni `multi_shot` default (v1 flipped it to `false` when a `base_video`
  was present, in `toWire`) is no longer computed for the caller — it is a
  `meta.notes` instruction, and Kling rejects the wrong pair for free (D9).

## D3 — The credit pool is Kling units (owner, 2026-09-16)

Kling's price list is in units ("0.6 Units ($0.084) /s"), the account draws
on prepaid resource packages counted in units, and the task receipt reports
`charge_type: "unit"` rows with `amount` in units. The owner rule — the pool
follows what the vendor meters, never a monid-side conversion — makes the
pool units: `credits.default = {label: "Kling units"}`, every line's
`consumes.amount` is the published units-per-second, exact decimals with no
float product on the card. The $0.14/unit list rate is documented on the pool
and applied downstream.

v1's cost basis ($0.098/unit for the trial pack, `KLING_USD_PER_UNIT`) is a
monid-services accounting fact and does not exist here.

## D4 — `billing[]` is the vendor's claim; cash rows forfeit it (owner, 2026-09-16)

v1 read `billing[]` for its internal `actualCost` and stripped it from the
output. Here it is exactly what `usage.consolidate` exists for (D27): the
vendor's own meter, in the pool's own units, lifted out of the payload in one
`pluck`. Unit rows are summed into `credits.default`; the claim wins, and the
derived fold (rate × seconds) rides out as `usage.mismatch.derived` when they
disagree.

Why the claim matters more here than the fold: Kling publishes a 2.6 "native
audio WITH voice control" row (1.2 units/s) that is selected by a `voice`
content item this connector does not expose, and any future row keyed on
something we do not model. With the claim, the BILL is right regardless; only
the estimate could be low, and the mismatch signal says so.

A `charge_type: "cash"` row is dollars off the account balance — a different
pool, one this doc does not declare (owner rule: no conversion). Its presence
forfeits the claim (`credits: {}`, logged), the fold settles, and the receipt
is still stripped. Absent or empty `billing` claims nothing — never `?? 0`.
`amount` is a decimal string and is `Number()`-ed.

The receipt is stripped for the reason v1 gave: it names our account type
(`cash_type`, test quota) and package, which are ours, not the caller's.

## D5 — Resolution × audio × video input as COMPOSITE lines, keyed from the request

v1 used `PER_UNIT_MATRIX` (resolution, resolution × audio) for ten endpoints
and a `TIERED` card with output-side stamped rows for Omni / O1. D19 removed
both shapes: selection is a COUNTING rule. So each endpoint is a `COMPOSITE`
of `PER_UNIT`·`SECOND` lines — `<res>`, `<res>_native_audio`,
`<res>_with_video` — and the fns put the seconds on the one line the REQUEST
selects (`settings.resolution`, `settings.audio`, and whether `contents[]`
carries a `feature_video` / `base_video`). The poll body echoes no settings,
so there is nothing to drift (the bytedance D4 lesson).

Every published row has a line, including the three 4K rows that all cost
3 units/s — the doc is the complete rate card. Two request shapes have no
published row and estimate on the nearest line rather than inventing one:
2.6 at 720p + native (keys the silent 720p line — Kling rejects the pair for
free) and Omni with a video + native audio (the video line wins — same
rejection). Both are `meta.notes`.

`every` stays at the default 1: Kling bills whole seconds linearly.

Consequence: every endpoint has ≥2 metered lines, so estimate + evidence are
DOC-level on all twelve; identical source interns (3.0 t2v/i2v share, the
five resolution-only cards share one evidence fn) — 14 new fnTable entries
for 12 docs.

## D6 — A 2xx submit with `code !== 0` is a synthesized 502

Kling wraps every response in `{code, message, request_id, data}` and
documents `code !== 0` as an error even on a 2xx (v1 synthesized 502 for it).
Ported, with the minimax D3 tightening: ONLY `code: 0` is success — an absent
or non-numeric code is a malformed 200 and takes the same 502 branch. v1 read
`Number(body.code)` and let `NaN !== 0` through as an error too, so this is a
formalization, not a divergence. The 2xx-clean-envelope-no-`data.id` case
throws `retriable: false` (contract violation).

## D7 — Poll non-2xx THROWS; a batch without our task also throws

Bytedance D7 verbatim: a failed SUBMIT means no task exists (DATA, zero
billed); a failed POLL means our GET failed while a task is very likely still
generating and still billing — throw (retriable) rather than abandon a video
we paid for. Kling has no cancel, so an abandoned task keeps costing.

The batch query returns `data[]`; a 2xx whose array does not contain our task
takes the same posture (throw, keep asking, `runMs` bounds it) — v1 threw
too, though non-retriable. Any status that is neither `failed` nor
`succeeded` (`submitted`, `processing`, or something new) stays RUNNING
(minimax D7a); `failed` synthesizes 500, `succeeded` without a video url
synthesizes 502, both `providerHttpStatus: 200`.

The COMPLETED output is the TASK object, unwrapped from the batch envelope
(v1 did the same) — consolidate then plucks `$.billing` off it.

## D8 — Nested selector defaults: `settings` is prefaulted

The price selectors (`resolution`, `duration`, `audio`) live one level down,
inside `settings`, which Kling marks optional. For the estimate to be
deducible from the input alone (D24) all three must materialize even when the
caller sends no `settings` at all. The binding does
`zBody.extend({ settings: zSettings.extend({ resolution: ….default("720p"),
… }).prefault({}) })`: `.prefault({})` (not `.default({})`, whose argument is
the OUTPUT type and would not accept `{}`) compiles to `"default": {}` on the
object, and the engine's ajv `useDefaults` then fills the nested defaults —
verified by `engine:estimate` with a bare `{prompt}` returning
`{"720p": 5}`. All three defaults are Kling's documented server defaults
(720p / 5 / off), as D25 requires.

Motion control has no duration and `character_orientation` has no default,
so there `settings` is REQUIRED at the binding (a missing one is
INVALID_INPUT) and only `resolution` is defaulted. `aspect_ratio`,
`multi_shot` and the non-priced `audio` switches (O1, motion control) keep
Kling's server defaults and are not materialized.

The estimate holds the REQUESTED duration (Kling bills the requested length,
v1 drill 2026-09-08); motion control holds the orientation ceiling (30 s
video / 10 s image, v1 `motionHoldSeconds`). The evidence settles the
generated seconds — `outputs[].duration` (a decimal string) summed over video
outputs and ROUNDED (a 3.041 s output billed 3) — on every endpoint, v1's
`klingBilledSeconds` reborn as a closed term.

`.describe()` on the `settings` object itself does not survive `.extend()` in
zod 4 (the registry entry is per instance), so the mirrors carry describes on
every FIELD and none on the container; the compiled docs have no field without
a description.

## D9 — Cross-field rules move to `meta.notes`; the mirror follows LIVE docs

v1 enforced eleven `superRefine` rules (frame counts, last-frame-needs-first,
720p-no-native on 2.6, refer_image caps, one-video, base_video exclusions,
unique ids, O1's 5|10 with a lone first frame, exactly-one-image-and-video).
None compile (bytedance D6); each is now a note on the endpoint it binds, and
Kling rejects the combination itself with a free 400. Single-field rules stay
enforced: `.strict()`, enums, `min`/`max`, and the media-URL `pattern`
(`^https:\/\/\S+$` — inline base64, `http://` and strings without an
`https://` prefix fail locally; anything else that is not a usable URL is
Kling's own free 400).

The mirrors were diffed against the live `.md` docs
(`https://kling.ai/document-api/api/video/<model>/<endpoint>.md`, 2026-09-16)
rather than copied from v1. Where they differ, live wins:

| field | v1 | live |
| --- | --- | --- |
| `prompt` max on 2.6 / 2.5 Turbo / O1 / 3.0 Turbo i2v | 3072 | 2500 |
| 2.6 image-to-video first + last frame | 720p or 1080p | 1080p only |
| 2.6 image-to-video `voice` content type | absent | present (excluded, account asset) |
| 3.0 image-to-video / Omni / motion `element` type | absent | present (excluded, account asset) |
| `duration` on 2.6 / 2.5 Turbo | `5 \| 10` union | enum `[5, 10]` (`z.literal([5, 10])` compiles to `enum`) |
| Omni `aspect_ratio` | defaulted `16:9`, dropped with a frame | optional, server default; "required when no first frame and no video" is a note |
| motion `settings` | flat required fields | `settings` optional in the table but `character_orientation` required — required at the binding |

Everything else (resolutions, duration ranges, audio enums, O1 3-10 s,
motion 3-30 s clip, image/video size limits) matched v1.

## D10 — Timeouts carry v1's values

`requestMs: 30_000`, `runMs: 1_800_000`, `pollMs: 10_000` — the `timeouts`
every v1 kling def overrides (services/workflows/endpointExecution/config.yml
documents the same numbers).

## D11 — No `output.fromError`

Kling's error envelope (`{code, message, request_id}`) and a failed task
(`{status: "failed", message, …}`) both carry `message` at the top level;
bytedance needed `fromError` because Ark buried it under `error.message`.
Nothing to lift, nothing to write.

## D12 — Fixtures are synthetic, and the happy chain carries an EMPTY receipt

No Kling key was available, so the eight chains are hand-built from the
response shapes v1's 2026-09-08 drill recorded and its tests pin (submit
`{code: 0, data: {id, status: "submitted"}}`, the batch task with
`outputs[{type: "video", url, duration: "5.041"}]` and
`billing[{charge_type: "unit", amount: "1.8", package_type: "video"}]`, the
400 with code 1201, the failed task with `billing: [{amount: "0"}]`). None
have seen live traffic — the PR says so.

One shared chain serves twelve endpoints with twelve different rates, and a
receipt can only equal one of their folds. So the happy chain's `billing` is
`[]` (a shape Kling does return, on processing ticks) and the derived fold
settles — the literal rate table in the test pins every endpoint's units.
The claim path has its own chains: `synthetic-task-succeeded-billed` (unit
row `"3"` — equals the 3.0 fold, disagrees with Turbo's 4 and surfaces the
mismatch signal) and `synthetic-task-succeeded-cash` (the cash row forfeits
the claim).

## D13 — displayName convention (reconcile addendum, 2026-09-16)

v1 deliberately kept provider/model names OUT of displayNames ("Text to
Video", "Transfer Motion to Character" — pinned by a v1 test). v2 names them
"Kling 3.0 Text to Video" etc. Decision: KEEP the v2 branded names — every
other v2 connector brands its displayNames (Seedance/MiniMax/Suzanne), the
catalog lists all providers side by side where neutral names collide, and
v1's neutrality rule served a storefront this repo does not render. Recorded
here because the flip was previously undocumented.

## D14 — per-endpoint docsUrl (reconcile addendum, 2026-09-16)

v1 carried a per-model documentation page on every def; the port kept only
the provider-level root. Restored: each endpoint's meta.docsUrl is v1's
model-specific kling.ai/document-api page (t2v and i2v share their model's
page, as v1 did).

## D15 — endpoint identities stay wire-faithful (reconcile addendum, 2026-09-16)

The reconcile's faithful-naming rule restored v1 catalog ids elsewhere
(fundable `deals/{id}`, suzanne `v1/models/{job_id}/download`, bytedance
`/v1/video/seedance-*`). Kling is the inverse case and KEEPS its v2 ids:
v1's `/v1/video/kling-*-t2v` names were INVENTED over a shared `/tasks`
wire, while v2's ids ARE the vendor's own create-task paths
(`/text-to-video/kling-3.0`, …). Faithful means the vendor's path — v2
already is.
