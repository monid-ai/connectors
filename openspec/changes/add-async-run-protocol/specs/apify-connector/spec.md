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
usageTotalUsd / the pricingPerEvent.actorChargeEvents rates in
`state.data` — keyed by the VERBATIM event names but PROJECTED to
`{eventPriceUsd}` per event (the raw card carries marketing text and
per-plan tier tables; serialized state above the engine cap fails the
run); failure → synthesized 500 with providerHttpStatus 200
and the statusMessage); stop POSTs `/abort` best-effort. ONE provider
`output.fromError` SHALL digest error envelopes (`{message, type?, raw}`
— raw preserved). ONE provider `usage.evidence` (the pre-D27 counts fn
renamed — design D27) SHALL settle QUANTITIES only: counts = the
dataset item count keyed via the doc's own model on `data.usage.model`
(leaf → the unit; composite → the sole metered component id — design
D19). It derives NO cost. ONE provider `usage.consolidate` SHALL claim
the poll-stashed `usageTotalUsd` off `data.lifecycle.state` (entry
OMITTED when absent, never `?? 0`; nothing to strip — the meter lives
in state, never the user-facing output): the claim WINS at settle, and
the ENGINE's fold through the doc's pinned rates cross-checks it on
EVERY run (`usage.mismatch.derived` on disagreement — the survey
guards rates BETWEEN runs, the mismatch signal guards them ON EVERY
run). The raw pricing signals stay recorded in state/the RAW run
record (reconciliation evidence — the receipt IS the output).

#### Scenario: Full shared chain settles
- **WHEN** the run-succeeded shape chain replays against any endpoint
- **THEN** the evidence fn counts carry the dataset item count under the doc's metered line id; the consolidate's usageTotalUsd claim settles as credits, and the pinned-rate fold cross-checks it (mismatch.derived on disagreement)

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
entry per lifecycle fn, one consolidate entry, and (absent an endpoint
override) the one generic evidence entry.

#### Scenario: Shared interning across endpoints
- **WHEN** the bundle is compiled
- **THEN** every apify doc references the same lifecycle.start/poll/stop and consolidate fn ids (and the same evidence id unless the endpoint overrides its counting)

### Requirement: Survey-verified per-endpoint models + pinned-field estimates
Every endpoint SHALL declare `usage.model` matching its LIVE published
pricing (verified per actor via the Apify API, not v1 folklore): 27
PER_UNIT·RESULT dataset actors; 17 COMPOSITE([PER_CALL, PER_UNIT·RESULT])
actors with a verified actor-start charge event; 2 PER_CALL actors
(`request`-event: tiktok-api, tiktok-comments-scraper-api); PER_UNIT·PAGE
on linkedin-profile-search. instagram-hashtag/post are SURVEY-CORRECTED
from v1's per-call to metered. Models reference `UsageModelKind.*` /
`Unit.*` consts, never raw strings. `usage.estimate` is a TYPED INLINE
fn on every METERED doc (design D23 — estimate presets deleted): it
reads the endpoint's OWN input-schema fields by direct typed property
access (v1's allow-list probing is NOT ported, and `utils.json` never
touches `data.input.body`), and its counts key is the doc's literal
metered key — field typos and foreign keys fail `deno task check`.
Estimates are
DEDUCED, never defaulted (design D24 — every limiting knob was audited
against three sources: our schema, the actor's LIVE published input
schema, and the v1 monid-services impl; the disposition table lives in
design D24): a knob whose ACTOR publishes a server `default` pins it as
a schema `.default(…)` — materialized into the validated body before any
hook, so the estimate reads the same effective value the vendor applies
— and a knob with NO usable server default (`prefill`-only, or an
"absent/0 = unbounded" sentinel) is REQUIRED AT THE BINDING SITE
(`zBody.required({...})` in endpoint.ts; schema/inputs.ts stays the
faithful actor mirror). No fallback constants exist; a body without its
limiting knob is rejected at validation. Composite components carry
`label`s where the charge-event key is vendor jargon ("base fee",
"reviews", "ads"). Flat-only endpoints (tiktok-api,
tiktok-comments-scraper-api) author NO quantities fns — their
`{counts: {}}` estimates are COMPILER-SYNTHESIZED (design D27) and the
engine derives their whole vector from the model (design D24).

#### Scenario: Comma-separated search terms counted
- **WHEN** instagram-search-scraper estimates {search: "a,b,c", searchLimit: 2}
- **THEN** the estimate is 6 RESULTs (2 per term — the actor runs each term as its own search)

#### Scenario: Related videos counted
- **WHEN** tiktok-video-scraper estimates one postURL with scrapeRelatedVideos and resultsPerPage 5
- **THEN** the estimate is 6 RESULTs (the post + 5 related records, every item billed)

#### Scenario: Channel default applied
- **WHEN** youtube-video-transcript estimates a channel_url without max_videos
- **THEN** the estimate is 10 RESULTs (the actor's own server default, schema-materialized)

#### Scenario: Exact-field estimate
- **WHEN** tweet-scraper estimates {maxItems: 7}
- **THEN** the estimate is `{counts: {"RESULT": 7}}`; absent maxItems falls back to 3 (v1 DEFAULT_ESTIMATED_RESULTS)

### Requirement: Component ids are OURS; the vendor event name rides `vendor`
Every apify model line SHALL key by OUR id — snake_case, unquoted
(`actor_start`, `comment`, `search_page`) — with the actor's published
charge-event name in the line's `vendor` field whenever the spellings
differ (`actor_start` ← "actor-start"; design D26, revising D19's
verbatim-key rule). The join across the settled counts, the broker
card, the drift guard, and the stashed run-record rates
(`state.data.pricingPerEvent[...]`) is `vendor ?? id`; leaf lines pin
their joined charge event in `vendor` explicitly. Every line SHALL pin
`consumes` = the GOLD-tier (BUSINESS plan) event price in the
provider's `default` USD pool — the def IS the rate card.
tiktok-comments-scraper-api SHALL declare BOTH its flat events
(`apify_actor_start` + `request`) as PER_CALL components (the old
collapsed single PER_CALL under-declared the vendor's card).

#### Scenario: One string at every station
- **WHEN** facebook-comments-scraper settles a run
- **THEN** the counts key is our id `comment` — equal to the vendor's event name, so no `vendor` field is declared and `vendor ?? id` matches the pricing API and the run record's chargedEventCounts verbatim

### Requirement: Pricing drift guard (live) v3 — regime + shape + join + rates
`deno task apify:pricing` (APIFY_API_KEY) SHALL fetch every actor's
CURRENT published pricing and FAIL on: a regime change (pricingModel ≠
PAY_PER_EVENT); a SHAPE mismatch between the published charge events
(flat = /start/-named or `request`; metered = the rest) and the declared
model (flat ⇔ a flat line; metered ⇔ a metered line); a declared line
whose `vendor ?? id` joins NO published `actorChargeEvents` key (a
vendor rename/removal fails NAMING the line — designs D19/D26); or a
pinned `consumes.amount` that DIFFERS from the live GOLD-tier event
price (`eventTieredPricingUsd.GOLD.tieredEventPriceUsd ??
eventPriceUsd` — design D26 reverses D18's rates-unchecked stance: the
def is the rate card the broker prices from, so a vendor repricing
fails CI, not an invoice). The reverse direction stays shape-level:
published add-on events we deliberately don't bill (filter-applied,
video-download…) do not fail the guard.

#### Scenario: Missed actor-start event
- **WHEN** an actor publishes an actor-start event but the model declares plain PER_UNIT
- **THEN** the survey exits nonzero naming the endpoint (this caught instagram-api-scraper on the guard's first run)

#### Scenario: Renamed charge event
- **WHEN** an actor renames the `comment` event a model line joins by
- **THEN** the survey exits nonzero naming the line whose `vendor ?? id` no longer matches

#### Scenario: Repriced charge event
- **WHEN** an actor's GOLD-tier `comment` price moves off the pinned consumes.amount
- **THEN** the survey exits nonzero naming the line and both amounts — the repricing fails CI before it can surface on an invoice

### Requirement: linkedin-profile-search bills its exact published events
The leaf-wise-override showcase SHALL model the actor's three published
charge events as keyed components — `search_page` (PER_UNIT·PAGE, every
mode) plus `full_profile` and `full_profile_with_email` (PER_UNIT·
RESULT, SELECTED by the input's profileScraperMode; "Short" selects
none; the vendor spellings "search-page" / "full-profile" /
"full-profile-with-email" ride each line's `vendor` field — design D26)
— and its estimate/evidence fns SHALL key the profile count by the
mode-selected component (design D19: select-one is counting logic, not
a model shape;
three metered components trip the compiler's doc-level-fns rule). Rates
are PINNED in each line's `consumes` (GOLD-tier — design D26): the
engine folds credits from the pinned amounts, and a vendor repricing
fails the pricing survey, never the settle. Page QUANTITY
reconstruction stays a run-record affair (quantity derivation, not
pricing): pages = round((usageTotalUsd − profiles × per-profile rate) /
page rate) using the run record's OWN charge-event rates (port-time
constants as fallback), clamped ≥1 when profiles came back — the
vendor's total divided by the vendor's rates is self-consistent even
mid-repricing. Estimate = ceil(maxItems/25) pages, profiles keyed by
the mode.

#### Scenario: Pages reconstructed from the run record
- **WHEN** a "Short" run's usageTotalUsd equals two search-page draws at the run record's own rate
- **THEN** the run settles evidence {"search_page": 2} and the engine folds credits at the PINNED amount — the pricing survey keeps pin and live equal

#### Scenario: The mode selects the billed component
- **WHEN** a "Full" run returns 13 profiles over 2 pages
- **THEN** counts settle {"search_page": 2, "full_profile": 13} — and a "Short" run settles the pages only

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
