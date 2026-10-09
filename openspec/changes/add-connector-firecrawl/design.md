# Design — firecrawl connector

Written retroactively in the 2026-09-16 reconcile: the change shipped with a
proposal only, and three deliberate v1→v2 behavioral deltas had no decision
record. This file is that record (the proposal's inline D19/D21/D22/D25–D29
references remain the schema-level authority).

## D1 — Required limiting knobs replace v1's authored defaults

v1 defaulted the primary limiting knobs and materialized them onto the wire
(`crawl.limit` default 25 — "never inherit the vendor's 10,000";
`search.limit` default 10; `agent.maxCredits` default 100). v2 REQUIRES all
three at the binding (`.required({...})`, stack rule D25): the estimate is
deduced from the caller's own stated cap, never from a constant.

Cost: a v1 caller omitting these now gets INVALID_INPUT instead of a safe
default — a breaking caller-contract change, accepted deliberately: a
default that silently caps (or silently spends 100 credits on an agent run)
is a worse surprise than a pre-flight rejection that names the field.

## D2 — Job-poll transient statuses keep the run alive

v1's `makeJobPoll` returned ANY non-2xx status lookup as terminal
COMPLETED data — a transient 503 on the STATUS READ abandoned a crawl whose
pages were still being billed. v2 keeps the run alive on the six
documented-retryable statuses (408/429/500/502/503/504, `pollAfterMs:
30_000`) and terminalizes only other non-2xx. Strictly safer for a paid
job; recorded here because it diverges from v1's posture.

## D3 — A meterless 2xx settles from the derived fold, not `?? 1`

v1's `providerGetActualCost` defaulted a response without `creditsUsed` to
1 credit. v2's consolidate OMITS the claim when the meter is absent (never
`?? 0`, never `?? 1`) and lets the derived fold (pinned card × evidence)
settle — the stack-wide D27 rule. For `/map` (flat 1) the two are
identical; for anything else the fold is checkable from public facts where
v1's constant was a guess.

## D4 — Sync-endpoint budget 300 s / 310 s

v1 authored no timeouts for the three sync endpoints (provider config
defaults applied). v2 pins `requestMs 300_000 / runMs 310_000` at the
provider: the mirrored per-page `timeout` input caps at 300 s, and our
budget must not contradict an input we accept. The two FREE job-readers run
at 30 s / 60 s.

## Out of scope, unchanged from the proposal

`/extract` (deprecated upstream, double-meters), the deferred index
endpoints, `/interact`, `/parse`, `/monitor`, `/crawl/params-preview`, and
v1's `GET /team/credit-usage` balance probe (the connector standard has no
balance hook — the platform owns account-runway monitoring; same posture as
ahrefs/opoint, recorded once in the reconcile report).
