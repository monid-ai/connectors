# metix-connector (delta)

## ADDED Requirements

### Requirement: Metix provider definition with no vendor meter
The metix provider SHALL declare name `metix`, `request.baseUrl`
`https://mira-api.metix.ai`, auth `presets.auth.bearer()`, timeouts 60 s
request / 60 s run, and a single credit pool `default` ("Metix API Credits").
It SHALL NOT declare `usage.consolidate`, `output.fromError`,
`output.fromResponse`, `input.toRequest` or a lifecycle: Metix reports no
meter in the response body or headers, refusals are real HTTP statuses whose
body `code` only mirrors the status line, and the `{code, msg, data}` envelope
is the documented output shape. The provider SHALL declare a `usage.evidence`
default that reads the vendor's own `quota.resultPath` for the endpoint's
family: `$.data.found` as an INTEGER count on the reads, and the length of the
one `$.data.<entity>_ids` array present on the searches.

#### Scenario: A search counts the IDs it returned
- **WHEN** `POST /v1/people/query` answers 200 with two entries in
  `data.profile_ids`
- **THEN** usage is `{credits: {default: 1}, evidence: {RESULT: 2}}` — the
  derived fold, since no claim exists to win over it

#### Scenario: A read counts the integer `found`, not the records
- **WHEN** `POST /entity/v1/profiles/detail-by-id` answers 200 with
  `data.found` of 2 and two entries in `data.results`
- **THEN** usage is `{credits: {default: 1}, evidence: {RESULT: 2}}`, read
  from `found` as a number rather than as a length

#### Scenario: The envelope is never rewritten
- **WHEN** any endpoint answers 200
- **THEN** the output still carries `code`, `msg` and `data` verbatim, and
  carries no `usage`, `credits` or `charged_credits` field

### Requirement: Structured search is a 25-ID block rate, free on a miss
Each of `POST /v1/people/query`, `POST /v1/jobs/query` and
`POST /v1/companies/query` SHALL declare `usage.model` as `PER_UNIT` over
`Unit.RESULT` with `every: 25` consuming 1 `default` credit, and
`usage.estimate` as the caller-stated `size`. Each SHALL require `size` at the
binding while its mirror keeps the vendor's optionality, and each mirror SHALL
be `.strict()`, matching the vendor's declared `additionalProperties: false`.

#### Scenario: Blocks round up
- **WHEN** `size` is 26
- **THEN** the estimate is `{credits: {default: 2}, evidence: {RESULT: 26}}`

#### Scenario: A valid query matching nothing is free
- **WHEN** `POST /v1/people/query` answers 200 with an empty `profile_ids`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: `size` is required and a misspelled key is refused
- **WHEN** the body omits `size`, or carries `sizee`, or sets `size` to 0 or
  10001
- **THEN** the run fails `INVALID_INPUT` before any network call

#### Scenario: The vocabulary is the vendor's to police
- **WHEN** the body carries a `where` tree naming a field this dataset does
  not have
- **THEN** the connector forwards it, and the vendor answers HTTP 400
  `error_code: query_spec` as data with zero usage

### Requirement: Reading records is a 5-record block rate, free on a miss
Each of `POST /entity/v1/profiles/detail-by-id`,
`POST /entity/v1/jobs/detail-by-id` and
`POST /entity/v1/companies/detail-by-id` SHALL declare `usage.model` as
`PER_UNIT` over `Unit.RESULT` with `every: 5` consuming 1 `default` credit,
and `usage.estimate` as the length of the requested ID array. The ID array
SHALL NOT be tightened beyond the vendor's own 1-to-100 bounds, and the
mirrors SHALL NOT be `.strict()`, because the vendor does not declare
`additionalProperties: false` on these routes and accepts `source` as an alias
for `_source`.

#### Scenario: Not-found records are free
- **WHEN** two IDs are requested and `data.found` is 0
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`, and one empty
  block does not round up to a credit

#### Scenario: A partial hit charges only what resolved
- **WHEN** six job IDs are requested and `data.found` is 5
- **THEN** usage is `{credits: {default: 1}, evidence: {RESULT: 5}}` and the
  missing ID costs nothing

#### Scenario: The estimate prices every requested ID
- **WHEN** seven IDs are requested
- **THEN** the estimate is `{credits: {default: 2}, evidence: {RESULT: 7}}` —
  the honest worst case, since whether an ID resolves is not knowable pre-run

### Requirement: Natural-language search adds a flat base charged on any 2xx
`POST /v1/people-search` SHALL declare `usage.model` as `COMPOSITE` of
`ai_search_base` (`PER_CALL`, 5 `default` credits) and `profile_ids`
(`PER_UNIT` over `Unit.RESULT`, `every: 25`, 1 credit). Its `usage.estimate`
and `usage.evidence` SHALL report only the metered component, keyed by
component id, because a flat line's quantity is the engine's to append. Its
`meta.notes` SHALL state that the base is charged even when the answer is
empty, and its `meta.description` SHALL point a caller at
`metix#v1/people/query` for constraints expressible as fields.

#### Scenario: Base plus one block
- **WHEN** the call answers 200 with two profile IDs
- **THEN** usage is
  `{credits: {default: 6}, evidence: {ai_search_base: 1, profile_ids: 2}}`

#### Scenario: The base is drawn on an empty answer
- **WHEN** the call answers 200 with no profile IDs
- **THEN** usage is
  `{credits: {default: 5}, evidence: {ai_search_base: 1, profile_ids: 0}}` —
  the one Metix search that is not free on a miss

#### Scenario: An error draws nothing, base included
- **WHEN** the call answers 401
- **THEN** usage is `{credits: {}, evidence: {}}`, because a flat line is
  drawn once per SUCCESSFUL run

### Requirement: Every search names the read that completes it
Each search endpoint's `meta.description` SHALL name the detail endpoint that
turns its IDs into records and SHALL state the 100-ID cap, and the provider's
`meta.notes` SHALL state that a search returns IDs and no record data. This is
the vendor's own most-common integration failure and `discover` ranks on this
text.

#### Scenario: The two-call shape is discoverable
- **WHEN** an agent inspects `metix#v1/jobs/query`
- **THEN** the description names `metix#entity/v1/jobs/detail-by-id` and the
  100-ID cap, and mentions that `total` can be read for free before paging

### Requirement: Cursors pass through unchanged
A search endpoint SHALL return the vendor's `next` cursor verbatim and accept
it back as `after`, bounded at the vendor's 2048 characters. The connector
SHALL NOT follow the cursor inside a run.

#### Scenario: A caller can page
- **WHEN** a search answers with a `next` string
- **THEN** that exact string is in the output and is accepted as `after` on
  the following call, needing no credential the engine withholds

#### Scenario: A last page is recognizable
- **WHEN** no further page follows
- **THEN** `next` is null in the output
