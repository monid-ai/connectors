# transcribe-so-connector (delta)

## ADDED Requirements

### Requirement: One endpoint, no by-id reads
The connector SHALL expose exactly one endpoint, `transcribe-so#transcriptions`
(`POST https://transcribe.so/api/v1/transcriptions`), and SHALL NOT expose
any endpoint that accepts or returns a transcription id. The connector runs
every caller under one shared vendor key; the id lives only in lifecycle
state.

#### Scenario: Identity is derived from the wire path
- **WHEN** the bundle compiles
- **THEN** `transcribe-so#transcriptions` posts to
  `https://transcribe.so/api/v1/transcriptions`, with no pinned `endpoint`,
  and it is the only `transcribe-so#` id in `connectors/ids.lock.json`

#### Scenario: The id never rides the output
- **WHEN** a run completes
- **THEN** the output carries no `id`, chapter items carry no `id`,
  `chapter_index` or `url`, and the serialized output does not contain the
  transcription id

### Requirement: The input is a monid shape with a required charge ceiling
The input body SHALL be `{url, duration_seconds?, language?, max_charge_usd,
formats?}`, `.strict()`. `max_charge_usd` SHALL be required at the binding;
`language` SHALL default to `"auto"` and `formats` to `["markdown"]` there.
`formats` SHALL be a non-empty subset of `markdown | srt | vtt`. `url`
SHALL be http(s) without whitespace, at most 2048 characters. There SHALL
be no `input.toRequest`.

#### Scenario: The ceiling is required
- **WHEN** a caller omits `max_charge_usd`, or sends 0 or a negative value
- **THEN** the run is rejected INVALID_INPUT before any upstream call

#### Scenario: Unknown keys and unknown formats are rejected locally
- **WHEN** a caller sends `source`, `callback_url`, `formats: ["pdf"]` or
  `formats: []`
- **THEN** the run is rejected INVALID_INPUT

### Requirement: The wire body is assembled in start with a derived source
`lifecycle.start` SHALL POST the flat body `{source, url, duration_seconds?,
language, max_charge_usd}` where `source` is `youtube` for youtube.com /
youtu.be hosts, `platform_url` for podcasts.apple.com, open.spotify.com,
soundcloud.com, vimeo.com, twitch.tv and loom.com, and `external_url`
otherwise; `formats` SHALL NOT be sent. The request SHALL carry
`Idempotency-Key` equal to the host-stable run id.

#### Scenario: A YouTube link is classified
- **WHEN** the input url is `https://www.youtube.com/watch?v=x`
- **THEN** the body sent carries `source: "youtube"`

### Requirement: Create errors are data unless retriable
A 409 (the same Idempotency-Key's first request still in flight), a 429 or a
5xx on the create SHALL throw (retriable — the idempotency key makes the retry
converge on the one job). Any other non-2xx SHALL settle as data with the
vendor's status and envelope, zero-billed. A 2xx whose `status` is `quoted`
SHALL settle as a synthesized 502 `hold_failed`.

#### Scenario: The same key is still in flight
- **WHEN** the create returns 409 `not_ready` with `Retry-After: 1`
- **THEN** the start fn throws, and a retried start with the same run id
  receives the original job's 202 and parks RUNNING on it

#### Scenario: The wallet is empty
- **WHEN** the create returns 402 `{error: {code: "insufficient_funds"}}`
- **THEN** the run COMPLETES with httpStatus 402, the envelope as output,
  and usage `{credits: {}, evidence: {}}`

### Requirement: The poll long-polls the vendor and settles on the row
`lifecycle.poll` SHALL `GET {request.url}/{id}/wait?timeout=25&include=chapters`.
A 429 SHALL keep the run RUNNING with `pollAfterMs` from `Retry-After`
(seconds, clamped 1-120 s, 15 s when absent). A 5xx SHALL throw. `_timed_out`
or a status of `pending`, `queued` or `processing` SHALL keep the run RUNNING
with the status in `state.stage`. `failed`, `cancelled` and `quoted` SHALL
settle as a synthesized 502 with `providerHttpStatus` the poll's status and a
FIXED `{error: {code, message}}` — the row's `error` text SHALL NOT be copied.

#### Scenario: The status read is rate-limited
- **WHEN** `/wait` answers 429 with `Retry-After: 7`
- **THEN** the outcome is RUNNING with `pollAfterMs` 7000 and the state
  carries forward

#### Scenario: The job fails
- **WHEN** `/wait` answers 200 with `status: "failed"` and an internal
  `error` string
- **THEN** the run COMPLETES with httpStatus 502, providerHttpStatus 200,
  output `{error: {code: "transcription_failed", message}}` with a fixed
  message, and zero usage

### Requirement: Completion fans out the artifact reads by formats
On `status: "completed"` the poll SHALL read the markdown transcript
(`/transcript?format=md&speaker_labels=true&timestamps=true`) always, and
`/subtitles?format=srt` / `?format=vtt` only when `formats` includes them,
concurrently. A 409 with reason `transcription_processing` SHALL keep the run
RUNNING; any other 409 reason, a non-text body, or another non-2xx SHALL
settle as a synthesized 502 with a fixed error. An EMPTY text body SHALL be
accepted (silent media has no cues). The output SHALL be
`{status, language, duration_seconds, title, transcript_markdown, srt?,
vtt?, chapters}` — `language` the row's `detected_language` when present,
else the requested one — with chapter items reduced to
`{title, summary, start_seconds, end_seconds}`. The row's `charge_usd`
SHALL NOT be returned.

#### Scenario: Default formats fetch markdown only
- **WHEN** a run completes with `formats` defaulted
- **THEN** exactly one artifact read is issued and the output has no `srt`
  or `vtt`

#### Scenario: All formats fetch all three
- **WHEN** a run completes with `formats: ["markdown", "srt", "vtt"]`
- **THEN** three artifact reads are issued and the output carries
  `transcript_markdown`, `srt` and `vtt` as text

### Requirement: The pool is dollars and the fold is the bill
`usage.credits` SHALL declare one pool, `default`, in US dollars. The model
SHALL be a leaf `PER_UNIT · MINUTE` line at 0.016667 dollars per minute. The
connector SHALL NOT declare `usage.consolidate`: the vendor's `charge_usd` is
the same minutes × rate rounded to four decimals, and claiming it would raise
`usage.mismatch.derived` on every run for a rounding difference.

#### Scenario: Evidence times rate settles, with no mismatch
- **WHEN** a 90-second job completes (the row carries `charge_usd: 0.0333`)
- **THEN** `usage` deep-equals `{credits: {default: 0.033334}, evidence:
  {MINUTE: 2}}` — no `mismatch` key — and `charge_usd` is absent from the
  output

### Requirement: The estimate holds the caller's ceiling in minutes
`usage.estimate` SHALL be pure and return
`{counts: {MINUTE: ceil(max_charge_usd / 0.016667)}}`; `duration_seconds`
SHALL NOT lower the hold. `usage.evidence` SHALL return
`{counts: {MINUTE: ceil(duration_seconds / 60)}}` off the completed row,
and `{counts: {}}` with a warning when the row carries no positive duration.

#### Scenario: Ten cents holds six minutes
- **WHEN** the endpoint is estimated with `max_charge_usd: 0.1`
- **THEN** the estimate is `{MINUTE: 6}` and no upstream call is made

#### Scenario: One dollar holds one hour
- **WHEN** the endpoint is estimated with `max_charge_usd: 1`
- **THEN** the estimate is `{MINUTE: 60}`

### Requirement: Caveats are declared, not buried
The provider `meta.notes` SHALL state: the asynchronous latency, that
`max_charge_usd` is a pre-charge ceiling equal to the hold, the retail rate
and its true-up exceptions, that 402 wallet errors are the connector's
wallet, that a failed job releases its hold and charges nothing, that there
is no cancel, and the output-size behaviour of `formats`.

#### Scenario: Provider caveats reach the endpoint
- **WHEN** the `transcribe-so#transcriptions` doc is inspected
- **THEN** it carries the provider's seven notes followed by its own two
