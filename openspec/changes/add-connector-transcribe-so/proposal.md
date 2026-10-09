# Proposal: add-connector-transcribe-so

## Why

transcribe.so (SUNMOON.CO PTE. LTD.) is a speech-to-text service for public
media URLs — YouTube, podcast platforms, direct audio/video links — that
returns a speaker-labelled, timestamped transcript with LLM-curated chapters
and SRT/VTT subtitles. It is the first TRANSCRIPTION connector in the catalog
(the `speech` leaf existed with no transcription endpoint behind it), and it
exercises two things no connector has yet:

- a **vendor whose price is a hard per-job ceiling the caller sets**
  (`max_charge_usd`, refused for free when exceeded), so the estimate is
  the caller's own ceiling expressed in minutes rather than a computed
  quantity — no fallback constant, nothing invented;
- a **run whose output is fan-out artifact reads** after the job completes
  (`Promise.all` over transcript + optional subtitle formats), driven by the
  caller's `formats` choice, under a vendor whose own long-poll endpoint
  does the waiting.

## What Changes

- **connectors/transcribe-so** — ONE endpoint, `transcribe-so#transcriptions`
  (`POST /transcriptions` against `https://transcribe.so/api/v1`), bearer
  auth, the whole async lifecycle authored on the PROVIDER (kling's posture:
  the run protocol is a provider fact) and a `default` pool in US dollars.
  No `usage.consolidate`: the derived fold is the bill (design D6).
- **The input is a deliberate monid shape, not the vendor mirror** (owner
  decision 2026-09-26, plan v2): `{url, duration_seconds?, language?,
  max_charge_usd, formats?}`. The vendor's `source` discriminator is
  DERIVED from the URL host inside `lifecycle.start` (youtube.com /
  youtu.be → `youtube`; podcasts.apple.com, open.spotify.com,
  soundcloud.com, vimeo.com, twitch.tv, loom.com → `platform_url`; else
  `external_url`), and `formats` is connector-only. There is NO
  `input.toRequest`: the lifecycle only ever sees the post-toRequest input,
  and `poll` needs `formats`, so the wire body is assembled at the one
  place that sends it (`utils.request({body})`).
- **`max_charge_usd` is REQUIRED at the binding**; `language` defaults to
  `"auto"` and `formats` to `["markdown"]` there. The estimate holds
  `ceil(max_charge_usd / 0.016667)` minutes; the evidence settles
  `ceil(duration_seconds / 60)` off the completed row; minutes × the pinned
  rate IS the bill. The row's `charge_usd` is the same product rounded to
  four decimals, so it is neither claimed nor returned — claiming it would
  raise monid's rate-drift alarm (`usage.mismatch.derived`) on every run.
- **Idempotent start**: the create carries `Idempotency-Key: <run id>`
  (the host-stable `data.run.runId`), so a 409 (same key still in flight) /
  429 / 5xx on the create is THROWN (retriable) and the retry converges on
  one paid job. Every other
  non-2xx is DATA — a 402 `insufficient_funds` / `spend_cap_exceeded` /
  `max_charge_exceeded` reaches the caller verbatim, zero-billed.
- **Leak hygiene under a shared key**: every monid run bills ONE
  transcribe.so account, so the transcription id lives only in lifecycle
  state, the output never carries it, chapter items are stripped to
  title/summary/start/end (the `url` deep-link carries the id for direct
  media sources), and terminal failures settle with FIXED error strings —
  the vendor's internal `error` text is never copied.
- **Fixtures**: five provider-level shared chains. The happy chain
  (`happy.json`) IS a real recording against
  `https://transcribe.so/test-90s.m4a` (2026-09-26, all formats, tasks 5.4 —
  done); the four `synthetic-*` chains cover the shapes a recording cannot
  provoke on demand.

## Capabilities

- `transcribe-so-connector`.

## Non-goals

- **No endpoint that takes a transcription id** — not `GET /transcriptions/
  {id}`, not `/transcript`, `/subtitles`, `/result`, `/ask`, `/search` as
  first-class endpoints. The key is shared: any by-id read would let every
  monid user read every other user's transcript. This is a permanent rule
  for this connector, stated at the top of `provider.ts`.
- **No `upload` source.** monid runs carry a URL, not a file; tus/multipart
  upload is out of scope.
- **No `lifecycle.stop`.** transcribe.so exposes no cancel for a started
  job; a run abandoned at `runMs` leaves a job that keeps running and stays
  charged (documented in `meta.notes`).
- **No callbacks.** The vendor's `callback_url` uses a per-job secret that
  does not fit monid's declarative HMAC webhook descriptor; polling stays.
- **No `output.fromError`.** The vendor's error envelope already carries
  `error.code` / `error.message` at a stable path.
- **No per-key rate-limit override** for the monid key (60/min/key is the
  default) — a transcribe.so follow-up, not this change.

## Impact

New connector tree + openspec record (with a `design.md`: the decisions are
connector-shaping, not contract-moving). Connector-only: no engine bump,
no new `Unit` (`MINUTE` exists), no new preset, no hook-ABI change, no new
category leaf (`speech` exists), no `categories.ts` or `config.yml` change.
`connectors/ids.lock.json` gains `transcribe-so#transcriptions`.
