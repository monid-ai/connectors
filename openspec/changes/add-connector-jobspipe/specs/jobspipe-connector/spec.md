# jobspipe-connector (delta)

## ADDED Requirements

### Requirement: JobsPipe provider definition with the vendor's credits_charged meter
The jobspipe provider SHALL declare name `jobspipe`, `request.baseUrl`
`https://api.jobspipe.dev`, auth `presets.auth.bearer()` with the default
`{apiKey}` credential shape (env `JOBSPIPE_CREDENTIALS_API_KEY`, alias
`JOBSPIPE_API_KEY`), timeouts 30 s request / 30 s run (the agentic search and the scan override
to 45 s: the vendor documents the agentic search at up to about 30 s and the
scan answers 504 past its own budget), one credit pool
`default` ("JobsPipe credits"), categories `jobs` and `company-enrichment`,
a provider-level `usage.consolidate` that plucks `$.metadata.credits_charged`
out of the output and claims it on `default` when it is a number (omitting
the claim otherwise), a provider-level `usage.evidence` that counts
`$.data` minus `$.metadata.jobs_already_paid` on PER_UNIT docs and nothing
on flat docs (the search and the scan override it), and a provider-level
`output.fromError` that normalizes `{error, message?}` into
`{message, detail?, raw}`. The provider SHALL NOT declare a lifecycle or an
`input.toRequest`.

#### Scenario: Claim agrees with the fold
- **WHEN** `POST /v1/jobs/search` with `limit: 3` returns 3 postings and
  `metadata.credits_charged: 3`
- **THEN** usage is `{credits: {default: 3}, evidence: {postings: 3,
  technologies: 0}}` with no `mismatch`, and `credits_charged` is absent from the output while
  `jobs_already_paid`, `next_cursor` and `credits_remaining` remain

#### Scenario: Already-paid postings are folded out, so the fold agrees with the claim
- **WHEN** the same search returns 3 postings with `credits_charged: 1` and
  `jobs_already_paid: 2`
- **THEN** usage is `{credits: {default: 1}, evidence: {postings: 1,
  technologies: 0}}` with no `mismatch`

#### Scenario: A fully-paid page settles at zero despite the pruned claim
- **WHEN** the same search returns 3 postings with `credits_charged: 0` and
  `jobs_already_paid: 3`
- **THEN** usage is `{credits: {}, evidence: {postings: 0, technologies: 0}}`
  (a zero claim is pruned at settle; the fold must not bill the free rows)

#### Scenario: The technologies opt-in is a second billable line
- **WHEN** a search with `include_technologies: true` returns 2 postings
  that each name a technology, `credits_charged: 4`,
  `technologies_credits_charged: 2` and `technologies_already_paid: 0`
- **THEN** usage is `{credits: {default: 4}, evidence: {postings: 2,
  technologies: 2}}` with no `mismatch`

#### Scenario: Empty page bills nothing
- **WHEN** a search returns `data: []` and `credits_charged: 0`
- **THEN** usage is `{credits: {}, evidence: {postings: 0, technologies: 0}}`

#### Scenario: The flat lookup has no meter and settles on the fold
- **WHEN** `GET /v1/companies/{key}` answers 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}` and the
  output is the vendor body untouched

#### Scenario: A productive scan costs one credit
- **WHEN** `POST /v1/stack/scan` answers 200 with two entries in `detected`
- **THEN** usage is `{credits: {default: 1}, evidence: {CREDIT: 1}}`

#### Scenario: An empty scan is free
- **WHEN** `POST /v1/stack/scan` answers 200 with `http_status: 0` and
  `detected: []`
- **THEN** usage is `{credits: {}, evidence: {CREDIT: 0}}`

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint receives a 402 `{error, message, credits_used, …}`,
  a 404 `{error}`, a 400 `{error}` or a 503 `{error}`
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the output is `{message: <error>, detail?: <message>, raw: <body>}`

### Requirement: Inputs mirror the published OpenAPI without translation
Every `schema/inputs.ts` SHALL mirror its published request schema
(docs.jobspipe.dev `JobSearchRequest`, `AgenticSearchRequest`,
`StackScanRequest`, the `key` path parameter) with optionality only — no
`.default()`, no invented fields — and no endpoint SHALL declare
`input.toRequest`. Where the vendor rejects unknown keys (every JobsPipe
body; the agentic request's top level) the mirror SHALL be `.strict()`;
where the vendor ignores them (`filters` inside the agentic request) the
mirror SHALL be an open record. `blur_company_data`, marked DEPRECATED and
ignored by the vendor, SHALL NOT be exposed.

#### Scenario: The published surface, nothing more
- **WHEN** the compiled `jobspipe#v1/jobs/search` body schema is inspected
- **THEN** it carries `cursor` and `order_by` and does not carry
  `blur_company_data`

#### Scenario: Unknown filters are refused before the wire
- **WHEN** `jobspipe#v1/jobs/search` runs with `{query: "x", limit: 3}`
- **THEN** the run fails INVALID_INPUT before any wire call

#### Scenario: Unknown keys inside agentic filters pass through
- **WHEN** `jobspipe#v1/jobs/agentic-search` runs with
  `filters: {job_country_code_or: ["DE"], bogus: 1}`
- **THEN** the input validates and the request is sent

### Requirement: Primary limiting knobs are required at the binding
`jobspipe#v1/jobs/search` and `jobspipe#v1/jobs/agentic-search` SHALL
require `limit` at the endpoint def even though the vendor publishes a
default (25 and 10 respectively), because the caller-stated limit is the
whole basis of the estimate. The agentic `limit` keeps the vendor's 1–25
bounds; the search `limit` keeps the vendor's floor of 1.

#### Scenario: Unbounded search is refused
- **WHEN** either search runs without `limit`, or with `limit: 0`
- **THEN** the run fails INVALID_INPUT before any wire call

#### Scenario: The estimate is the limit
- **WHEN** `jobspipe#v1/jobs/search` is estimated with `limit: 25`
- **THEN** the estimate is `{credits: {default: 25}, evidence: {postings: 25,
  technologies: 0}}`; with `include_technologies: true` it is
  `{credits: {default: 50}, evidence: {postings: 25, technologies: 25}}`

### Requirement: Four endpoints, one card
`jobspipe#v1/jobs/search` (POST) SHALL price a COMPOSITE of two PER_UNIT ·
RESULT components at 1 credit each — `postings` (rows minus
`jobs_already_paid`) and `technologies` (rows naming at least one technology
minus `technologies_already_paid`, the `include_technologies` surcharge);
`jobspipe#v1/jobs/agentic-search` (POST) SHALL price PER_UNIT · RESULT at
1 credit; `jobspipe#v1/companies/{key}`
(GET, path param `key`) SHALL price PER_CALL at 1 credit;
`jobspipe#v1/stack/scan` (POST) SHALL price PER_UNIT · CREDIT at 1 credit
with its own evidence of 1 when `detected` is non-empty and 0 otherwise,
and an estimate of 1. Every doc SHALL drain the `default` pool, carry the
provider's bearer inject and consolidate fns (interned to one fnTable
entry each), and declare `output.fromError`.

#### Scenario: Identities
- **WHEN** the bundle is compiled
- **THEN** the jobspipe ids are exactly `jobspipe#v1/companies/{key}`,
  `jobspipe#v1/jobs/agentic-search`, `jobspipe#v1/jobs/search` and
  `jobspipe#v1/stack/scan`
