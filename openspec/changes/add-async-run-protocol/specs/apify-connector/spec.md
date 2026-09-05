# apify-connector (delta)

## ADDED Requirements

### Requirement: Provider-level actor-run lifecycle (v1 port, 1:1)
The apify provider SHALL declare `request.baseUrl https://api.apify.com`,
`presets.auth.bearer()`, timeouts {30s request, 300s run, 2s poll}, and the
whole lifecycle at provider level: start executes the endpoint's compiled
request (POST `/v2/acts/{owner~name}/runs`), relays non-2xx as data,
throws on a 2xx without a run id, else parks with
`{externalRunId, datasetId}` state (externalRunId = the reserved
correlation key); poll GETs `/v2/actor-runs/{id}` (no exitCode →
running; SUCCEEDED → fetch `/v2/datasets/{id}/items` and stash
pricingModel/pricePerUnitUsd/usageTotalUsd in state; failure → synthesized
500 with providerHttpStatus 200 and the statusMessage); stop POSTs
`/abort` best-effort. Start is literally `utils.request()` — the default
relay over the endpoint's compiled request. ONE provider `output.fromError`
SHALL digest error envelopes (the v1 apifyErrorBody port: `{message,
type?, raw}` — raw preserved). ONE
provider consolidate SHALL settle: units = dataset item count as
`result`; cost = PRICE_PER_DATASET_ITEM (perUnit × items) or
PAY_PER_EVENT (usageTotalUsd), else absent; evidence = the state signals.

#### Scenario: Full recorded run settles
- **WHEN** the recorded happy chain (start → poll×N → dataset) replays
- **THEN** units equal the dataset item count and evidence carries the poll-stashed pricing signals

#### Scenario: Actor failure zero-billed
- **WHEN** the poll response carries exitCode 1
- **THEN** the run completes as a 500 envelope with zero usage

### Requirement: Pure-data endpoints with scaffolded static schemas
Each apify endpoint SHALL declare only meta + start request (actorId baked
as `owner~name` in the path) + a static input schema scaffolded from the
actor's PUBLISHED schema via `deno task apify:scaffold` (non-strict —
supersets pass through). Tranche 1: linkedin-profile-scraper,
instagram-profile-scraper, google-maps-scraper, tweet-scraper,
youtube-video-transcript, with REAL recorded fixtures. All apify docs
SHALL share one fnTable entry per lifecycle fn and one consolidate entry.

#### Scenario: Shared interning across endpoints
- **WHEN** the bundle is compiled
- **THEN** every apify doc references the same lifecycle.start/poll/stop and consolidate fn ids

### Requirement: Live schema drift guard
A live-gated test (APIFY_API_KEY) SHALL re-fetch each actor's published
schema and fail if any live REQUIRED property is missing from the
compiled input schema — a test:live signal, never a deterministic-build
break.

#### Scenario: Actor adds a required field
- **WHEN** an actor's published schema gains a required property absent from the checked-in schema
- **THEN** the drift test fails naming the endpoint and the scaffold command
