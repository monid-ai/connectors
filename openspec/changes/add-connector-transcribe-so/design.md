# Design: add-connector-transcribe-so

Decision record for the transcribe.so connector. Vendor contract:
https://transcribe.so/developers/docs (OpenAPI `app/api/v1/openapi/spec.yaml`
in the vendor repo, read 2026-09-26). Precedents: kling (provider-level
async lifecycle, endpoints as data), firecrawl (status URL = request url +
id, one interned lifecycle), saperly (wire body assembled in `start` under a
run-stable `Idempotency-Key`). No schema or engine change; this file exists
because the input deliberately departs from the D25 mirror rule and the
reviewer asked for the reasons to be on record.

## D1 — The input is NOT the vendor mirror (owner, plan v2 2026-09-26)

The vendor's create body is `{source, url, duration_seconds?, language?,
max_charge_usd?}` where `source` is a discriminator the CALLER must classify
(`youtube` | `platform_url` | `external_url` | `upload`). D25 would mirror
that. The connector instead publishes `{url, duration_seconds?, language?,
max_charge_usd, formats?}`:

- `source` is dropped: it is derivable from the URL and asking an agent to
  classify a host it just pasted is a way to produce 400s, not information;
- `upload` is out of scope (a monid run carries a URL, not a file);
- `formats` is ADDED: it is a connector-side switch (D4) that never reaches
  the wire, and without it every run would fetch three artifacts.

Cost, stated: `schema/inputs.ts` is not a faithful mirror, so a vendor field
added upstream does not appear here until this file is edited. The file's
header says so.

## D2 — The wire body is assembled in `lifecycle.start`, not `input.toRequest`

`input.toRequest` looked like the natural seam for D1's translation, but the
lifecycle hooks receive the POST-toRequest input (`zLifecycleStartData` /
`zLifecycleTickData`: "the validated (post-toRequest) input"). A `toRequest`
that stripped `formats` would leave `poll` unable to read it. So the input
stays whole through the run and `start` builds the flat body at the one
place that sends it, via `utils.request({headers, body})` — the saperly
`place-calls` shape. The endpoint declares no `toRequest` (the spec asserts
it), and the wire body is byte-identical to what a mirror would have sent.

## D3 — `source` is derived from the URL host, by string ops

`youtube.com` / `youtu.be` (any subdomain: `www.`, `m.`, `music.`) →
`youtube`; `podcasts.apple.com`, `open.spotify.com`, `soundcloud.com`,
`vimeo.com`, `twitch.tv`, `loom.com` → `platform_url`; everything else →
`external_url`. The list is the vendor's own `platform_url` roster. `URL` is
not on the closed-term whitelist, so the host is cut out with the firecrawl
string recipe (scheme off, first path segment, userinfo off, port off,
`www.` off). A host the vendor later adds to `platform_url` still works
here as `external_url` only if the vendor accepts it that way — otherwise
it is a 400 and a one-line edit.

## D4 — `formats` gates the artifact reads; markdown is always fetched

The completed row is read through three separate vendor routes (transcript
markdown, `/subtitles?format=srt`, `?format=vtt`). Fetching all three on
every run triples the output for callers who wanted a transcript, and a long
recording's markdown alone runs to hundreds of KB. `formats` (enum
`markdown | srt | vtt`, default `["markdown"]` at the binding) decides which
reads are issued, concurrently (`Promise.all`); markdown is unconditional
because it IS the transcript and carries the chapter table of contents. An
EMPTY text body is a legitimate artifact (silent or music-only media has no
cues) — only a non-text body is `malformed_artifact`.

## D5 — Failures settle with FIXED error strings; the id never rides the output

Every monid run bills ONE transcribe.so account (the shared key), so the
transcription id is a cross-tenant handle: whoever holds it can read the
transcript through the vendor's by-id routes with that same key. Hence:

- the id lives only in `state.externalRunId` and no endpoint takes one
  (proposal non-goal #1, permanent);
- terminal failures (`failed`, `cancelled`, `quoted`, artifact 409s) settle
  as OUR synthesized 502 with a fixed `{error: {code, message}}` — the
  row's `error` column is internal text (worker names, ffmpeg output, the
  id) and the vendor's 409 text names the id; neither is copied. The 409
  `reason` enum value (`artifact_missing`, …) IS reused as the code: it is a
  closed vocabulary, not free text;
- chapter items are reduced to `{title, summary, start_seconds,
  end_seconds}`: `id` and `chapter_index` are dropped, and so is `url`,
  because for direct-media sources it falls back to the vendor's dashboard
  deep-link `…/transcriptions/<id>?t=…`. The happy test asserts the id
  string is absent from the serialized output.

A failed job RELEASES its hold on the vendor side (the vendor's
`trg_transcriptions_release_hold_on_fail` trigger; its failure email says
"refunded"), so the fixed message says nothing was charged.

## D6 — No `usage.consolidate`; the fold is the bill (review, 2026-09-26)

The completed row carries `charge_usd`, and the first draft claimed it (D27:
the vendor's meter wins). But the vendor ROUNDS it: the committed happy
fixture records `charge_usd: 0.03` for 2 billed minutes while the doc's fold
is 2 × $0.016667 = 0.033334. Claiming the vendor charge would raise
`usage.mismatch.derived` for this fixture — and in general whenever the
vendor rounds — and that signal is monid's rate-drift alarm
(alibaba/bytedance tests assert it is absent). A false alarm on a rounding
difference is worse than no claim. So: no consolidate, the
engine's evidence × rate settles, `charge_usd` is not returned in the
output, and the happy test deep-equals `usage` as one object to prove no
`mismatch` key exists. If the vendor ever reports the unrounded amount, a
consolidate can be added back as a genuine cross-check.

## D7 — Create 409 / 429 / 5xx throw; everything else is data

The create carries `Idempotency-Key = data.run.runId` (24 h, body-hash bound
upstream). A 409 `not_ready` means the SAME key's first request is still
being served — a job may already exist and be charging — so settling it as
data would leave that job with nothing polling it; the retry replays the key
and receives the job's 202. 429 and 5xx (503 `ProbeUnavailable` included)
mean no job exists yet and the key makes the retry safe. All three THROW
(retriable, kling D7 posture). 400 / 401 / 402 (`insufficient_funds`,
`spend_cap_exceeded`, `max_charge_exceeded`) held nothing and settle as
zero-billed data with the vendor's envelope verbatim, so the caller reads
the vendor's own code.

## D8 — Poll is the vendor's long-poll; the output `language` is the detected one

`GET /transcriptions/{id}/wait?timeout=25&include=chapters` holds up to 25 s
server-side (requestMs 35 s), so the doc's `pollMs` (2 s) only bridges
consecutive long-polls; an early return that moved the row into
`processing` waits 15 s before the next one. Output `language` is
`detected_language ?? language`: the requested value is usually the literal
"auto", which is not a language.
