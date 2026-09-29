# orbit-connector (delta)

## ADDED Requirements

### Requirement: Orbit provider definition
The orbit provider SHALL declare name `orbit`, `request.baseUrl`
`https://api.orbitsearch.com`, auth `presets.auth.bearer()`, and the single
credit pool `default` ("Orbit credits"). It SHALL declare a provider-level
`output.fromError` that normalizes `{status: "failed", error: {code, message}}`
into `{message, code?, raw}`. It SHALL NOT declare a lifecycle, because the
profile read is a plain synchronous request and a provider-level `start`
would replace its declarative execution.

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint receives a 402
  `{status: "failed", error: {code: "developer_api_credits_insufficient", ...}}`
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the output carries `code` and `message` beside the raw envelope

### Requirement: Orbit's receipt settles every run
Every v3 response carries Orbit's own receipt, `billing: {id, pricingVersion,
reservedCredits, consumedCredits, releasedCredits, heldCredits, status}`, whose
`status` goes `open` to `settled` and whose `consumedCredits` on the terminal
snapshot is the charge. Every billed endpoint SHALL price a leaf `PER_UNIT` in
`CREDIT` units at amount 1, and the provider SHALL declare `usage.evidence`
reading `billing.consumedCredits` as that count and `usage.consolidate`
claiming the same figure while plucking `billing` out of the output. The
receipt SHALL be the EVIDENCE and not only the claim, because the engine
prunes a zero claim and falls back to the derived fold, and Orbit's zero
receipts are real answers. No endpoint SHALL infer a charge from result
states or from the submit's status code. Rates SHALL appear only in
`usage.estimate`, the pre-run ceiling, read from the published card.

#### Scenario: A row seen mid-build is not a charged build
- **WHEN** a search returns twelve index hits, one of them `enriching` on the
  submit and `ready` on the terminal snapshot, with a receipt of 2
- **THEN** usage is `{credits: {default: 2}, evidence: {CREDIT: 2}}`

#### Scenario: A build never seen mid-build is still charged
- **WHEN** a discovery search returns one index hit and two discovered
  people, only one of whom was ever seen `generating`, with a receipt of 11
- **THEN** usage is `{credits: {default: 11}, evidence: {CREDIT: 11}}`

#### Scenario: A zero receipt settles zero
- **WHEN** an enrichment of a profile already at depth answers `202 running`
  with `reservedCredits` 0 and completes with `consumedCredits` 0
- **THEN** the run settles with no credits, whatever the submit's status code

#### Scenario: The receipt leaves the payload
- **WHEN** any single-receipt endpoint settles
- **THEN** `billing` is absent from the output

### Requirement: A run is terminal when its receipt is
Each lifecycle SHALL keep a run open while its status is `running` OR its
receipt's `status` is `open`, so a settle that lands after the status never
bills a partial figure.

#### Scenario: A terminal status with an open receipt is read again
- **WHEN** a status read answers `completed` with a receipt still `open`
- **THEN** the poll returns RUNNING and the next read's settled receipt bills

### Requirement: Run budgets cover measured build times
Partial-depth and index-only work settles inside 90 seconds; full-depth
builds were measured at 24 to 27 minutes. `orbit#v3/search`,
`orbit#v3/enrich/{profile_id}` and `orbit#v3/enrich` SHALL declare `runMs` of
45 minutes, and each poll SHALL back its cadence off once a run is clearly a
long build.

#### Scenario: The budget exceeds the slowest measured build
- **WHEN** any of the three compiled docs is inspected
- **THEN** `timeouts.runMs` is at least 27 minutes

### Requirement: Inputs mirror the published v3 OpenAPI
Every `schema/inputs.ts` SHALL mirror its v3 component with optionality only —
no `.default()`, no invented fields. Orbit's own documented defaults SHALL be
stated at the binding in `endpoint.ts`, so the compiled doc shows them, and
the search estimate SHALL read the same numbers as fallbacks, because a
default inside a union arm is shown and never filled. "At least one of
`query`, `intent` or `signals`" SHALL be a union of three arms, each
requiring one of them. "`candidate_discovery_limit` is read with
`candidate_discovery: true`" SHALL live in `meta.notes`.

#### Scenario: One arm per way in
- **WHEN** the compiled `orbit#v3/search` body schema is inspected
- **THEN** it is an `anyOf` of three strict arms requiring `query`, `intent`
  and `signals` in turn, and on every arm `limit` defaults to 20,
  `profile_depth` to `partial`, `candidate_discovery` to false,
  `candidate_discovery_limit` to 10, and `include_profile` to true, each with
  its description

#### Scenario: A body with none of the three is rejected
- **WHEN** a search body carries only `limit`
- **THEN** the run fails `INVALID_INPUT` and no request reaches Orbit

#### Scenario: The vendor's own caps are the mirror's caps
- **WHEN** the compiled `orbit#v3/enrich` body schema is inspected
- **THEN** `profile_ids` carries `minItems` 1 and `maxItems` 20, and the
  required set is `["profile_ids", "operation"]`

### Requirement: The gate is the published contract, and idempotency is the engine's
Every input mirror SHALL be strict, as Orbit's published schemas are
(`additionalProperties: false`), so the engine rejects a field the published
contract does not carry before it reaches the vendor. The live API accepts
fields the published contract does not carry, some of them priced, and one of
those alone would break the estimate's promise to be a ceiling. No mirror
SHALL expose `request_id`: Orbit lets a body `request_id` override the
`Idempotency-Key` header and scopes it per API key, which on a broker is one
namespace shared by every caller.

#### Scenario: An unpublished field is rejected at the gate
- **WHEN** a search carries `signals.face_source`, `webhooks`, or `request_id`
- **THEN** the run fails `INVALID_INPUT` and no request reaches Orbit

### Requirement: A search runs to a terminal snapshot
`orbit#v3/search` SHALL carry a lifecycle whose `start` executes the submit
and whose `poll` reads the route Orbit names in `links.status` until the run
is terminal. A 2xx snapshot without a `results` array SHALL be an
infrastructure failure, exactly as a 2xx without `search_id` is.

#### Scenario: A submit-time failure reads like a poll-time one
- **WHEN** the submit answers 200 with `status: "failed"` and its reason at
  `candidate_discovery_failure` (or, for an enrichment, at `failure`)
- **THEN** the start phase lifts that reason into Orbit's own
  `{status, error: {code, message}}` envelope before settling, so the same
  `output.fromError` reads a submit-time and a poll-time failure alike

#### Scenario: A failed search is ours/theirs and bills nothing
- **WHEN** the status route answers 200 with `status: "failed"`
- **THEN** the run reports `httpStatus` 500 with `providerHttpStatus` 200 and
  usage `{credits: {}, evidence: {}}`

#### Scenario: The estimate is the ceiling the caller authorized
- **WHEN** `orbit#v3/search` is estimated with `limit` 100 and
  `profile_depth: "full"`
- **THEN** the estimate is 1,010 credits — ten cached blocks plus a full
  build for every person the search may return

### Requirement: An enrichment runs to a terminal snapshot
`orbit#v3/enrich/{profile_id}` SHALL carry a lifecycle whose `poll` follows
`links.status`, falling back to the URL-encoded request route when the
response carries no link. A `202` SHALL carry no billing meaning.

#### Scenario: A full build settles its receipt
- **WHEN** a `full` enrichment completes at `generation_level` 3 with a
  receipt of 10
- **THEN** usage is `{credits: {default: 10}, evidence: {CREDIT: 10}}`

### Requirement: The batch fans out over its children
`orbit#v3/enrich` SHALL read its still-open children one at a time, and once
none are open SHALL read EVERY child once more to assemble
`{request_id, status, results}`. Child ids have the shape
`{parent}:{profile_id}` and SHALL be URL-encoded in every path. The batch
SHALL override the provider's evidence and consolidate to settle the SUM of
its children's receipts; a child that completed on the submit carries a null
receipt and adds nothing. The per-child receipts SHALL stay in the output.

#### Scenario: The batch settles the sum of its children
- **WHEN** a `partial` batch of two returns one child that builds (receipt 5)
  and one that completed on the submit with a null receipt
- **THEN** usage is `{credits: {default: 5}, evidence: {CREDIT: 5}}` and the
  output carries both children under the parent's `request_id`

### Requirement: One status-read retry rule across every lifecycle
Every lifecycle SHALL treat a status read answering `408`, `429` or any `5xx`
as a failed LOOKUP rather than finished work, returning RUNNING so the run
survives — Orbit's error guide puts `429` and every temporary server failure
in one retry class, and the work keeps drawing credits while the lookup is
unavailable. When the response carries `Retry-After` (seconds), it SHALL set
the next tick's cadence, clamped to [1s, 120s]; otherwise a fixed backoff
applies. Every lifecycle SHALL poll the route Orbit names in `links.status`,
falling back to the documented path shape.

#### Scenario: An uncommon 5xx is held like a 503
- **WHEN** a search status read answers `599`
- **THEN** the poll returns RUNNING rather than settling the run

#### Scenario: Retry-After sets the cadence
- **WHEN** a transient status read carries `Retry-After: 7`
- **THEN** the next tick is scheduled 7 seconds out

#### Scenario: A transient final read re-opens a batch child
- **WHEN** the batch's final sweep reads a completed child and gets a `503`
- **THEN** that child is re-opened for a later tick instead of being
  published as `failed`, so its receipt survives into the sum

### Requirement: Submits carry a run-stable idempotency key
Every lifecycle `start` SHALL send `Idempotency-Key: {runId}:submit` on its
submit, with `runId` the host-stable run id, so a retried or replayed start
converges on the search or enrichment the first attempt created rather than
creating and paying for a second one.

#### Scenario: A replayed submit is the same submit
- **WHEN** a run's `start` executes twice with the same `runId`
- **THEN** both submits carry the same `Idempotency-Key`, and Orbit answers
  the second with the resource the first created

### Requirement: A profile read under a declared identity
`orbit#v3/profile/{profile_id}` SHALL declare the public identity
`/v3/profile/{profile_id}` while calling the vendor's own
`GET /v3/enrich/{profile_id}`, because that path is shared with the build and
two defs on one path collide. It SHALL settle on its receipt like every other
billed endpoint, with an estimate of the published profile-read rate.

#### Scenario: The identity is declared and the call is the vendor's
- **WHEN** the compiled doc is inspected
- **THEN** its id is `orbit#v3/profile/{profile_id}` and its request url is
  `https://api.orbitsearch.com/v3/enrich/{profile_id}`
