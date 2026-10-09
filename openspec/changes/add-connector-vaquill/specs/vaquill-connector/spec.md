# vaquill-connector (delta)

## ADDED Requirements

### Requirement: Vaquill provider definition with the shared vendor meter

The vaquill provider SHALL declare name `vaquill`, `request.baseUrl`
`https://api.vaquill.ai/api/v1`, auth `presets.auth.bearer()`, timeouts 60 s
request / 65 s run, credit pool `default` ("Vaquill credits"), and a
provider-level `usage.consolidate` that plucks the top-level
`creditsConsumed` receipt out of the output and claims it. The provider
SHALL NOT declare a lifecycle, an `input.toRequest`, an
`output.fromResponse` or an `output.fromError`.

The 60 s budget is deliberate: retrieval runs a hybrid dense plus sparse
search and a cross-encoder rerank, and an `includeBody` page pulls up to 50
full statute texts alongside it.

#### Scenario: Claim wins and agrees

- **WHEN** `POST /us/statutes/search` returns a page reporting
  `creditsConsumed: 4`
- **THEN** usage is `{credits: {default: 4}, evidence: {call: 1}}` with no
  `mismatch`, and `creditsConsumed` is absent from the output

#### Scenario: Absent meter falls back to the fold

- **WHEN** a response carries no `creditsConsumed` field at all
- **THEN** the claim is omitted and the doc's own model settles the run

#### Scenario: Vendor non-2xx is zero-billed data

- **WHEN** any endpoint receives a 401 `{detail}`
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the body passes through untouched

### Requirement: Identities are the vendor's own paths

Every endpoint's identity SHALL be its wire path, `{act_id}` placeholder
included, so the endpoint an agent names is the endpoint Vaquill documents.
Folder names are organisational only.

#### Scenario: The seven section reads are named for the section

- **WHEN** the compiled bundle is inspected
- **THEN** it carries `vaquill#us/statutes/section/{act_id}` and its
  `/body`, `/related`, `/changes`, `/cited-by`, `/definitions` and
  `/cross-state` children, each declaring no explicit `endpoint` because
  `request.path` already is the identity

### Requirement: Inputs mirror the published OpenAPI without translation

Every `schema/inputs.ts` SHALL mirror its published request schema with
optionality only: no `.default()`, no invented fields, no `.strict()`. The
vendor's documented defaults (`limit` 10, `offset` 0, `includeBody` false,
`excerptChars` 500, `matchType` "any", `excludeRepealed` false on search,
`includeBody` false on the batch lookup) SHALL be materialized at the
BINDING in `endpoint.ts`, where the estimate can read them. No endpoint
SHALL declare `input.toRequest`.

#### Scenario: The validated input is the wire request

- **WHEN** any vaquill doc is inspected
- **THEN** `input.toRequest` and `output.fromResponse` are both undefined

#### Scenario: Vendor vocabularies are enforced before the wire

- **WHEN** `vaquill#us/statutes/count` runs with
  `corpusType: "CASE_LAW"`
- **THEN** the run fails INVALID_INPUT before any wire call, because
  `CASE_LAW` is not one of the 21 corpora Vaquill publishes
- **AND** `corpusType: "CFR"` is accepted

#### Scenario: Date filters are real calendar dates

- **WHEN** `changedSince`, `publishedFrom`, `publishedTo` or `asOf` is given
  `2026-02-30`
- **THEN** the run fails INVALID_INPUT before any wire call, because those
  fields are `z.iso.date()` rather than a four-two-two digit pattern

#### Scenario: A list filter accepts one value or many

- **WHEN** `state`, `corpusType`, `actStatus`, `source`, `code`, `chapter`,
  `part` or `agency` is given either a scalar or an array
- **THEN** each is accepted, because that union is the vendor's own shape,
  and an array travels as a repeated query key where the endpoint is a GET

### Requirement: An empty answer is refunded, and must settle at zero

Vaquill returns HTTP 200 with `creditsConsumed: 0` when a lookup finds
nothing. `vaquill#us/statutes/count`, `vaquill#us/statutes/divisions`,
`vaquill#us/statutes/section/{act_id}/cited-by`,
`vaquill#us/statutes/section/{act_id}/definitions` and
`vaquill#us/statutes/section/{act_id}/cross-state` SHALL therefore declare a
PER_UNIT model at the list price whose quantity is an ANSWERED lookup,
counted 1 or 0, rather than a flat PER_CALL.

A flat model cannot express the refund: a zero claim prunes to an empty
claim, an empty claim falls back to the derived fold, and a flat fold would
bill the list price for a call the vendor did not charge for. The threshold
is a COUNTING rule owned by the fns, never a model shape (design D19).

#### Scenario: A miss bills nothing

- **WHEN** `#cross-state` returns an empty `neighbors`, `#definitions` an
  empty `terms`, `#cited-by` an empty `citers`, `#count` a `count` of 0, or
  `#divisions` an empty `divisions`, each with `creditsConsumed: 0`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: The price does not scale with the answer

- **WHEN** `#cross-state` returns five equivalent provisions and
  `#definitions` returns forty-eight terms
- **THEN** each settles at one answered lookup, 6 and 4 credits, matching
  the vendor's claim

#### Scenario: The estimate quotes the list price

- **WHEN** any of the five is estimated
- **THEN** the promise is one answered lookup, because a pre-run hook cannot
  know whether the corpus holds an answer; a miss settles below it, never
  above

### Requirement: An empty answer the vendor charges for is absorbed

Vaquill charges four answers that the caller SHALL NOT pay for: a
`#search` page that matches nothing (4 credits), a `#section/{act_id}/body`
outside the held editions, answered `available: false` (6 credits), an
empty `#section/{act_id}/changes` page (1 credit), and a `#resolve`
citation that does not resolve (2 credits each). Each of those endpoints
SHALL declare a metered model whose quantity is the answer delivered, and
SHALL override `usage.consolidate` to decline the vendor's claim in that
case, so the derived fold settles at what the caller owes. The difference
is the broker's cost.

#### Scenario: An empty search page bills nothing

- **WHEN** `#search` returns `results: []` with `creditsConsumed: 4`
- **THEN** usage is `{credits: {}, evidence: {call: 0}}`, with no
  `mismatch`, because the claim was declined rather than disputed

#### Scenario: A text outside the held editions bills nothing

- **WHEN** `#section/{act_id}/body` answers `available: false` with
  `creditsConsumed: 6`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: A poll that finds nothing bills nothing

- **WHEN** `#changes` returns an empty `changes` page with
  `creditsConsumed: 1`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`; `#related`
  stays flat, because its page is never empty for a known section

#### Scenario: The estimate quotes the list price

- **WHEN** `#search`, `#section/{act_id}/body` or `#changes` is estimated
- **THEN** the promise counts one answered page or text, because a pre-run
  hook cannot know whether the answer will be empty; an empty answer
  settles below it, never above

### Requirement: The batch endpoints bill on their own measured bases

`vaquill#us/statutes/sections` SHALL count sections RETURNED, and
`vaquill#us/statutes/resolve` SHALL count citations RESOLVED.

#### Scenario: A batch lookup refunds the ids it could not resolve

- **WHEN** `#sections` is given one resolvable and one nonexistent `actId`
- **THEN** evidence is `{section: 1}` and the bill is 2, matching the
  vendor, and the unresolved id is reported in `notFound`

#### Scenario: A batch resolve does not bill the miss

- **WHEN** `#resolve` is given one resolvable and one nonsense citation,
  which the vendor bills 4 with `resolvedCount: 1`
- **THEN** evidence is `{RESULT: 1}` and the bill is 2: the vendor's claim
  is declined because it covers the miss, and the fold bills the hit

#### Scenario: A batch resolve with no miss adopts the vendor's claim

- **WHEN** every citation in a `#resolve` batch resolves
- **THEN** the vendor's `creditsConsumed` is the bill, 2 per citation, and
  agrees with the fold

#### Scenario: An empty batch is refused before the wire

- **WHEN** `#sections` runs with `actIds: []` or `#resolve` with
  `citations: []`
- **THEN** the run fails INVALID_INPUT

#### Scenario: The resolve cap is the RAW list, not the unique count

- **WHEN** `#resolve` runs with 60 copies of one citation
- **THEN** it is accepted, because the vendor collapses duplicates BEFORE
  applying its 50-unique cap, and that request bills 2 rather than being
  refused
- **AND** the mirror bounds the array at 500, the vendor's raw ceiling, so a
  client-side cap of 50 would refuse a request the vendor accepts

### Requirement: Search prices the ranked page and its inline bodies apart

`vaquill#us/statutes/search` SHALL declare a COMPOSITE of a metered `call`
component at 4 credits per page that holds at least one hit and a metered
`body` component at 6 credits per hit that returns full text under
`includeBody`.

#### Scenario: A plain page bills the search line only

- **WHEN** `#search` runs without `includeBody`
- **THEN** usage is `{credits: {default: 4}, evidence: {call: 1}}`

#### Scenario: Inline bodies bill at the ordinary body price

- **WHEN** `#search` runs with `includeBody` and two hits return text
- **THEN** usage is `{credits: {default: 16}, evidence: {body: 2, call: 1}}`,
  which is 4 + 2 x 6 and agrees with the vendor's claim

#### Scenario: The estimate promises against the caller's own ceiling

- **WHEN** `#search` is estimated with `limit: 10` and `includeBody`
- **THEN** the promise is 64 credits, and a page that returns fewer bodies
  settles below it, because a hit whose text cannot be resolved comes back
  `body: null` and is refunded

#### Scenario: Paging depth is bounded

- **WHEN** `#search` runs with `limit` above 50
- **THEN** the run fails INVALID_INPUT, and `limit: 50` is accepted

### Requirement: Coverage is free and takes no input

`vaquill#us/statutes/coverage` SHALL declare the FREE model and no input
schema.

#### Scenario: The one response with no meter

- **WHEN** `#coverage` returns its matrix
- **THEN** the body carries no TOP-LEVEL `creditsConsumed`, so the claim is
  omitted and usage is `{credits: {}, evidence: {}}`
- **AND** the `meta.creditsConsumed: 0` this endpoint reports one level down
  survives the exact `pluck` untouched, as documented response data saying
  the call was free

### Requirement: Every endpoint stays on the documented base url

Every compiled url SHALL begin
`https://api.vaquill.ai/api/v1/us/statutes/`.

#### Scenario: The compiled bundle does not drift off the surface

- **WHEN** the compiled bundle is inspected
- **THEN** all thirteen vaquill urls satisfy that prefix
