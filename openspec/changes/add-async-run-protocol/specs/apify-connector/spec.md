# apify-connector (delta)

## ADDED Requirements

### Requirement: Provider-level actor-run lifecycle (v1 port, 1:1)
The apify provider SHALL declare `request.baseUrl https://api.apify.com`,
`presets.auth.bearer()`, timeouts {30s request, 300s run, 2s poll}, and the
whole lifecycle at provider level: start executes the endpoint's compiled
request (POST `/v2/acts/{owner~name}/runs`) via `utils.request()`, relays
non-2xx as data, throws on a 2xx without a run id, else parks with
`{externalRunId, data: {datasetId}}`; poll GETs `/v2/actor-runs/{id}` (no
exitCode → RUNNING with a `{}` patch; SUCCEEDED → fetch
`/v2/datasets/{id}/items` and stash pricingModel / pricePerUnitUsd /
usageTotalUsd / the VERBATIM pricingPerEvent.actorChargeEvents rate card
in `state.data`; failure → synthesized 500 with providerHttpStatus 200
and the statusMessage); stop POSTs `/abort` best-effort. ONE provider
`output.fromError` SHALL digest error envelopes (`{message, type?, raw}`
— raw preserved). ONE provider consolidate SHALL settle: units = dataset
item count as `result`; cost = PRICE_PER_DATASET_ITEM (perUnit × items)
or PAY_PER_EVENT (usageTotalUsd), else absent; evidence = the
`$.data.*` state signals.

#### Scenario: Full shared chain settles
- **WHEN** the run-succeeded shape chain replays against any endpoint
- **THEN** units equal the dataset item count and cost derives from the poll-stashed signals

#### Scenario: Actor failure zero-billed
- **WHEN** the poll response carries a non-zero exitCode
- **THEN** the run completes as a 500 envelope with zero usage

### Requirement: Provider-level typed state
The provider SHALL declare `lifecycle.state` (the `data` bag: datasetId,
pricingModel, pricePerUnitUsd, usageTotalUsd, pricingPerEvent
(eventName → {eventPriceUsd}), searchPages, profileCount) — compiled to
`doc.lifecycle.stateSchema` on every apify doc, engine-validated per
tick.

#### Scenario: Corrupt threaded state fails closed
- **WHEN** a poll is fed state.data with a non-string datasetId
- **THEN** the engine rejects INVALID_INPUT before the fn runs

### Requirement: Pure-data endpoints with scaffolded static schemas
Each apify endpoint SHALL declare only meta + start request (actorId baked
as `owner~name` in the path) + a static input schema scaffolded from the
actor's PUBLISHED schema via `deno task apify:scaffold` (non-strict —
supersets pass through) + a `usage` declaration (model and/or estimate).
All 46 v1 endpoints are ported. All apify docs SHALL share one fnTable
entry per lifecycle fn and one consolidate entry.

#### Scenario: Shared interning across endpoints
- **WHEN** the bundle is compiled
- **THEN** every apify doc references the same lifecycle.start/poll/stop and consolidate fn ids

### Requirement: Survey-verified per-endpoint models + pinned-field estimates
Every endpoint SHALL declare `usage.model` matching its LIVE published
pricing (verified per actor via the Apify API, not v1 folklore): 27
PER_UNIT·RESULT dataset actors; 17 COMPOSITE([PER_CALL, PER_UNIT·RESULT])
actors with a verified actor-start charge event; 2 PER_CALL actors
(`request`-event: tiktok-api, tiktok-comments-scraper-api); PER_UNIT·PAGE
on linkedin-profile-search. instagram-hashtag/post are SURVEY-CORRECTED
from v1's per-call to metered. Models reference `UsageModelKind.*` /
`Unit.*` consts, never raw strings. `usage.estimate` names the endpoint's
OWN input-schema fields via `presets.estimate.*` (v1's allow-list probing
is NOT ported — inputs are pinned); endpoints whose knobs no flat-field
preset can see (amazon-search-scraper: per-item maxPages;
facebook-profile-posts-scraper: newline targets × max_posts) declare
custom inline estimates. PER_CALL endpoints declare no estimate (the
engine default `{units: []}` is already exact).

#### Scenario: Exact-field estimate
- **WHEN** tweet-scraper estimates {maxItems: 7}
- **THEN** the estimate is 7 RESULT units; absent maxItems falls back to 3 (v1 DEFAULT_ESTIMATED_RESULTS)

### Requirement: Pricing drift guard (live)
`deno task apify:pricing` (APIFY_API_KEY) SHALL fetch every actor's
CURRENT published pricing and FAIL on a regime change (pricingModel ≠
PAY_PER_EVENT) or a SHAPE mismatch between the published charge events
(flat = /start/-named or `request`; metered = the rest) and the declared
model (flat ⇔ a PER_CALL component; metered ⇔ a PER_UNIT/VARIANT
component). Rates are deliberately UNCHECKED — apify event prices are
tiered by OUR subscription plan; rate reconciliation is a services-side
alert against the card.

#### Scenario: Missed actor-start event
- **WHEN** an actor publishes an actor-start event but the model declares plain PER_UNIT
- **THEN** the survey exits nonzero naming the endpoint (this caught instagram-api-scraper on the guard's first run)

### Requirement: linkedin-profile-search bills pages from LIVE run-record rates
The leaf-wise-override showcase SHALL read its PAY_PER_EVENT rates FROM
the run record (`pricingInfo.pricingPerEvent.actorChargeEvents.*.
eventPriceUsd` — search-page / full-profile / full-profile-with-email);
the port-time constants ($0.05 / $0.0032 / $0.008) are FALLBACK only
(finding 5: baked constants drift). Pages = round((usageTotalUsd −
profiles × perProfileRate) / pageRate), clamped ≥1 when profiles came
back; units = pages (PAGE) + profiles (RESULT); `usage.model` =
per_unit PAGE; estimate = takePages ?? ceil(maxItems/25) pages.

#### Scenario: Live rate beats the fallback
- **WHEN** the run record carries a $0.02 page rate and usageTotalUsd $0.04
- **THEN** the run settles 2 pages (the $0.05 fallback would have yielded 1)

### Requirement: Live schema drift guard
A live-gated test (APIFY_API_KEY) SHALL re-fetch each actor's published
schema and fail if any live REQUIRED property is (a) missing from the
compiled input schema OR (b) present but not required by it
(`live.required ⊆ compiled.required` — an optional→required flip breaks
callers at the vendor). A test:live signal, never a deterministic-build
break.

#### Scenario: Actor adds a required field
- **WHEN** an actor's published schema gains a required property absent from the checked-in schema
- **THEN** the drift test fails naming the endpoint and the scaffold command

#### Scenario: Optional flips to required
- **WHEN** a property our schema marks optional becomes required upstream
- **THEN** the drift test fails naming the flip
