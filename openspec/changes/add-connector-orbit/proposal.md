# Proposal: add-connector-orbit

## Why

Every other people provider in the catalog answers a lookup: a match, a
contact, a record. Orbit answers a different question — *tell me about this
person* — and returns the deepest context it can assemble about them, with a
source behind every claim. That is the capability an agent reaches for when
the job is personalization or research rather than routing: choosing a gift a
friend will actually like, learning about someone before meeting them,
briefing itself on a client, or researching a person properly.

It fits the connector standard without stretching it: one base URL, bearer
auth, a published OpenAPI document, and an **unauthenticated JSON rate card**
at `GET /v2/developer/pricing` that pins every credit line in this change.

Its billing turned on a fact the published contract does not carry yet: every
v3 response includes Orbit's own `billing` receipt, and `consumedCredits` on
the terminal snapshot is the charge. The first cut of this connector did not
know that and derived its bill from observed result states. A live drill
retired that approach — it overbilled a row seen `enriching` that Orbit never
charged as a build, underbilled a build that finished between two ticks, and
would have billed a no-op enrich that answers `202`. The receipt settles every
run now, and nothing is inferred.

## What Changes

- **connectors/orbit** — 4 endpoints against `https://api.orbitsearch.com`,
  bearer auth (`sk_orb_` keys) needing only the `search:read` and
  `profile:read` scopes, one credit pool, a provider-level
  `output.fromError`, and no provider lifecycle.
  - 1 sync: profile read.
  - 3 async: search, enrich, batch enrich — each carrying its own lifecycle.
    Orbit's two status routes are the routes those lifecycles poll, not
    catalog endpoints: the engine drives every poll inside the run, so a
    caller never needs to read a search or an enrichment by id.
- **The receipt is the evidence.** Every billed endpoint is a leaf `PER_UNIT`
  in `CREDIT` units; provider-level `usage.evidence` reads
  `billing.consumedCredits` and provider-level `usage.consolidate` claims it
  and plucks the receipt out of the payload. It has to be the evidence and
  not only the claim: the engine prunes a zero claim and falls back to the
  derived fold, and Orbit's zero receipts — a no-op enrich, an empty search —
  are real answers. A run stays open while its receipt reads `open`.
- **Budgets are measured.** Full-depth builds took 24 to 27 minutes on the
  live drill, so the three lifecycles carry a 45-minute run budget and back
  their cadence off once a run is clearly a long build.
- **The batch fans out.** Orbit's batch has no parent status route: the submit
  returns one child `request_id` per profile and each reads back on its own.
  The lifecycle polls only the children still running, then reads every child
  once more so the envelope carries one current snapshot per profile. Bounded
  by the vendor's own cap of 20, and child reads are free.
- **Estimates are ceilings, and they are the point.** `limit: 100` at full
  depth authorizes up to 1,010 credits while a typical cached search settles
  at 1. An agent that reads `estimate` before committing sees the difference;
  one that does not, finds out afterwards.
- 17 synthetic fixture chains and 29 replay tests, covering both zero-settle
  regressions (the cached search, the no-op enrich) explicitly, plus a
  runtime schema gate on every endpoint that takes an input.
- **Catalog positioning.** `discover` ranks on `meta.description`, so the
  copy is the product surface. The provider and endpoint descriptions name
  the jobs an agent actually arrives with — a person the user just
  mentioned, a prospect before outreach, a candidate or counterparty under
  diligence, the people behind a company being researched — while keeping
  "the deepest available context about a PERSON" as the spine rather than
  narrowing into a sales-tool pitch.

## Capabilities

- `orbit-connector`.

## Non-goals

- **Watchers are held back** (`POST/GET/PATCH/DELETE /v3/watchers`,
  `/v3/watchers/{id}/runs`). A watcher's charges — 1 credit per run, 5 more
  for a run that finds something new — accrue on Orbit's schedule for as long
  as the watcher lives, which is to say entirely outside the run that created
  it. Nothing in the settle pipeline can anchor that, and pretending a create
  call is free while it commits an open-ended draw is the one thing a billing
  model must not do. It arrives when the two platforms have agreed how a
  recurring charge settles.
- **Bulk search is held back** (`/v3/search/bulk` and its three reads),
  pending an internal review on the vendor side. It reports
  `billing.consumed_credits` on the job and exposes a cancel route, so it
  fits the same receipt-settled shape when it comes.
- **Population search is held back** (`/v3/search/populations` and its
  quote), and this one is worth stating precisely because the endpoint LOOKS
  settleable. A population is priced as one number and reserved when the
  search starts — but Orbit then "settles them as the work completes, and
  releases what it did not use when the search ends"
  (`docs.orbitsearch.com/concepts/credits`). `credits_quoted` is therefore a
  CEILING, not a charge, and the public contract carries no settled figure
  anywhere. Billing the ceiling would overcharge every population that
  under-runs, and billing zero would hand out the work free. The free quote
  goes with it: a price an agent cannot act on is a dead end in a catalog.
  The pair arrives together once a snapshot reports what the search actually
  settled.
- **Webhooks are held back** (`/v3/webhooks`). The create response returns a
  plaintext signing secret exactly once, and a completed run is retrievable
  later with its full provider output — so the endpoint is unsafe to expose
  until field-level redaction is confirmed end to end. The other three webhook
  routes are not worth a connector on their own.
- Face-signal search is priced on Orbit's card and absent from the published
  request schema; it arrives with the schema.
- The company lines on the rate card price routes the public v3 document does
  not carry yet.
- No new category leaf: `people-enrichment` already exists.
- No dollar conversion in the doc. The published package tiers are not
  uniform, so a single $/credit constant would be fiction; the pool is
  Orbit's own credits and the conversion stays the broker card's job.

The four that remain are exactly the endpoints that settle inside their own
run — and, separately, the core of the request/response surface Orbit's own
agent skill (`docs.orbitsearch.com/skill.md`) and hosted MCP server publish
for this job.

## Impact

New connector tree. No new `Unit`, preset, hook, category or compiler change,
and no engine bump — `deno task version:check` reports no contract-surface
change. One line in `shared/testing/fixtures.ts` adds `retry-after` to the
recorded-response header allowlist, as that file's header provides for. Fixtures carry the `synthetic-` prefix until they are recorded against
the dedicated provider key.
