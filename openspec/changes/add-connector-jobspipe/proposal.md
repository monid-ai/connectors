# Proposal: add-connector-jobspipe

## Why

Hiring is one of the clearest signals an agent can read about a company —
what it is building, where, at what level, with which technologies — and
job postings are scattered across dozens of boards and career sites in
dozens of shapes. JobsPipe collects them from 30+ sources, deduplicates and
normalizes them into one schema (title, company with domain / headcount /
revenue, location to metro level, arrangement, seniority, annualized USD
salary, skills and ESCO concepts, ISCO / ISIC codes, visa stance, status),
and sells access per posting. Its REST API is a clean fit for the connector
standard: one base URL, bearer auth, JSON in and out, and a vendor meter
(`metadata.credits_charged`) on the billable searches — nothing about it
needs a new engine capability.

It is also the first `jobs` connector: the leaf exists in
`connectors/categories.ts` with nothing under it.

## What Changes

- **connectors/jobspipe** — 4 synchronous endpoints against
  `https://api.jobspipe.dev`, bearer auth, one credit pool, a provider-level
  `usage.consolidate` that lifts the vendor's `metadata.credits_charged`
  claim, a generic `usage.evidence` that counts `data[]` on per-unit docs,
  and an `output.fromError` that digests `{error, message?}`.
  - `#v1/jobs/search` — filter search, a COMPOSITE of two PER_UNIT ·
    RESULT lines at 1 credit each: `postings` and, behind the
    `include_technologies` opt-in, `technologies` (one extra credit per
    returned posting that names a technology); `limit` REQUIRED at the
    binding (D25).
  - `#v1/jobs/agentic-search` — plain-language search, same card, `limit`
    REQUIRED, 25-posting ceiling, longer timeout.
  - `#v1/companies/{key}` — one company's enriched record by domain / URL /
    email / name, flat PER_CALL 1.
  - `#v1/stack/scan` — the technologies one domain serves, PER_UNIT ·
    CREDIT 0/1: one credit when the scan detected something, free when it
    did not (the API's flat-route rule hands the credit back on an empty
    delivery, and an unreachable site is a 200 with `detected: []`).
- **Faithful mirrors, no wire layer.** Each `schema/inputs.ts` mirrors the
  published OpenAPI request schema field for field (optionality only, no
  defaults), `.strict()` where the vendor rejects unknown keys. No endpoint
  declares `input.toRequest`: the validated input IS the wire body. The one
  deliberate omission is `blur_company_data`, which the spec marks
  DEPRECATED and ignored.
- **Claim wins, fold agrees.** JobsPipe charges a posting once per
  calendar month per account: a page that repeats already-paid postings
  bills less than its row count, and `credits_charged` says how much. The
  consolidate lifts that number out as the claim (D27). The evidence folds
  the vendor's own `jobs_already_paid` (and `technologies_already_paid`)
  out of the row counts, so the fold agrees with the claim — and, since a
  zero claim is pruned at settle, a fully-paid page folds to 0 instead of
  billing rows the vendor gave away. The flat docs carry no meter, so
  their claim is empty and the derived fold settles.
- Real recorded fixtures, trimmed, for every reachable scenario (including
  the empty stripe.com scan and a search with `include_technologies`);
  synthetic (`synthetic-` prefix) only for the four a single account cannot
  reproduce on demand — the partial and the full already-paid discount, the
  402 quota and the agentic 503 — plus a curated `test-inputs.json` for
  `deno task record`.

## Capabilities

- `jobspipe-connector`.

## Non-goals

- The insights family (`/v1/insights/*`, 10 endpoints, flat 1 credit each),
  the beta technology endpoints (`/v1/companies/search`,
  `/v1/companies/{key}/technologies`, `/v1/technologies*`) and the
  monitors (`/v1/monitors*`, a saved-search resource with its own
  lifecycle) are not ported. Each is a follow-up change; the monitors in
  particular are a RESOURCE in the D30–D47 sense and should arrive as one.
- No dollar conversion in the doc. JobsPipe's price per credit is
  package-dependent ($1.96 per 1,000 at the smallest package down to $1.05
  at the largest), so the pool is the vendor's own credit and the
  conversion stays the broker card's job.
- No new category leaf: `jobs` and `company-enrichment` already exist.

## Impact

New connector tree + four ids in `connectors/ids.lock.json`. No new `Unit`,
preset, hook, category or compiler change; `ENGINE_VERSION` does not move.
