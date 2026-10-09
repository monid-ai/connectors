# Design: add-connector-muapi-media

## D1 — Provider transport and identity

The provider uses `presets.auth.header("x-api-key")` and
`https://api.muapi.ai/api/v1` as its base URL. Each model endpoint owns a
distinct request path, so its public identity is derived from the provider
and path (`muapi#nano-banana-2`, `muapi#nano-banana-2-edit`, and
`muapi#veo3.1-text-to-video`).

## D2 — Shared asynchronous lifecycle

`lifecycle.start` relays the model POST and parks MuAPI's `request_id` (with
documented id fallbacks) as `externalRunId`. `lifecycle.poll` calls
`GET /predictions/{request_id}/result`. Created, queued, processing, running,
pending, and submitted remain running. Failed, cancelled, canceled, and
expired predictions synthesize a 500 with the provider response recorded.
A successful prediction must expose a media URL in the supported output
slots; a completed prediction without one synthesizes a 502. Non-2xx poll
responses throw so a transient query failure does not silently abandon a
generation that may still be billable.

## D3 — Input mirrors and defaults

Nano Banana 2 accepts a prompt, the documented aspect-ratio set, optional
Google Search enhancement, 1K/2K/4K resolution, and JPG/PNG output. Its
editing sibling additionally requires one to fourteen `images_list` URLs.
Veo 3.1 accepts a prompt, 16:9 or 9:16, the documented eight-second
duration, and 720p/1080p/4K resolution. Endpoint bindings materialize the
published defaults before request construction and usage estimation.

## D4 — Rate cards and usage evidence

The current public MuAPI estimator was checked on 2026-09-24. Nano Banana 2
and Nano Banana 2 Edit use `PER_UNIT`·`RESULT` component lines at $0.06,
$0.09, and $0.12 for 1K, 2K, and 4K. Veo 3.1 text-to-video uses
`PER_UNIT`·`RESULT` lines at $2.50, $3.25, and $3.70 for 720p, 1080p, and 4K.
Estimate and evidence select exactly one component from the validated
request and count one successful result. The result envelope's actual USD
claim remains authoritative at settlement; any difference is exposed by
Monid's normal derived-usage mismatch signal.

## D5 — Billing and errors

The provider-level `usage.consolidate` plucks the complete `cost` object,
reads `amount_usd` (including the documented nested fallback), and returns
the rest of the output. Provider errors bypass usage hooks and settle with
empty credits/evidence. `output.fromError` preserves MuAPI's nested error
message/code and raw response for debugging.

## D6 — Test strategy

Synthetic fixtures cover submit, processing, successful image/edit/video
completion, vendor-cost stripping, terminal task failure, and rejected
authentication. Replay tests prove each endpoint's URL output, usage card,
zero-billing failures, estimates without I/O, and invalid required/enumerated
inputs.
