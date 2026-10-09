# saperly-connector (delta)

## ADDED Requirements

### Requirement: Provider surface
The `saperly` connector SHALL declare bearer auth against
`https://api.saperly.com`, one `default` (US-dollar) credit system, and ONE
shared nested-strip projection for success AND error bodies
(`monthlyPriceCents`, `currency`, `nextChargeAt`, `connectionId`,
`webhookUrl` never reach users).

#### Scenario: Error bodies are stripped too
- **WHEN** an upstream 4xx body carries `connectionId`
- **THEN** `output.fromError` removes it before the caller sees the error

### Requirement: The phone-number resource
`saperly/phone-number` SHALL declare: `slug` "phone-number"; `data`
{phoneNumber?, country, numberType, externalRefs.connection?}; `inputs`
for create/update/release; `usage` = one fixed line `rent` $2/MONTH
(CREATION_TIME anchor — flat, no estimated lines, so no
`reconcileUsage`); lifecycle `verify` (404 or `releasedAt` ⇒ inactive;
observed monthly cents as `observedUsage.rent`; `nextChargeAt` as
`periodEndIso`), `release` (stable per-resource idempotency key; 404/410
tolerated; embedded-connection delete converges by retry), `refresh`
(full patch; the connection pointer is AUTHORITATIVE — absence clears
it; number fields carry forward on degraded reads); view `connection`
(labeled) = the live sanitized persona (name/instructions/voice/model
only). Host policy (charge/release leads) lives host-side, not on the
def.

#### Scenario: Never charge a dead number
- **WHEN** check finds 404 or `releasedAt`
- **THEN** it reports inactive with the reason and the host skips the charge

### Requirement: Provisioning is a consent-guarded saga
`/provision-numbers` (CREATES + seed, PER_CALL $2) SHALL start with:
quote → create the connection FIRST (fail fast, no money moved) → purchase
with consented cents → exactly ONE 409 PriceChanged retry using the 409's
actual prices under a DISTINCT idempotency key → bind; a bind failure after
purchase degrades to a connection-less resource with best-effort orphan
delete and the /update-numbers repair path — it never fails the run. The
consented quote is stamped on the success body; `usage.consolidate` claims
it and absorbs the stamps. The seed is forgiving (upstream id alone
suffices); a 2xx with no readable id throws (PROVISION_CONSTRUCT).

#### Scenario: Malformed quote is our 502, as data
- **WHEN** the quote 2xx lacks the consent cents fields
- **THEN** start completes `httpStatus: 502, providerHttpStatus: <quote
  status>` with a `malformed_quote` body, zero-billed

### Requirement: Calls are metered runs
The connector SHALL implement `/place-calls` (USES `$.body.fromNumberId`;
PER_UNIT SECOND every 60 @ $0.28; estimate floor 60 s; accrue 30 s cadence
with 60 s buffer) as a metered async run, which SHALL:
park with the call id as `externalRunId`; poll with an exists-predicate on
`costCents` for settlement and a deterministic `graceLeft` countdown
(24 polls) before accepting terminal-but-unsettled truth; stop by hangup +
bounded settle-wait (10 × 3 s sleeps) returning COMPLETED when settled else
UNRESOLVED. Evidence counts integer seconds with the
derive-from-settled-charge fallback; consolidate claims settled
`costCents`. `/inbound-calls` SHALL share poll/stop byte-identically
(fnTable dedupe) and start by ADOPTING the event-carried callId with no
upstream call.

#### Scenario: Transient poll blip keeps running
- **WHEN** the poll read returns a non-2xx
- **THEN** the run stays RUNNING with state carried forward

### Requirement: Reads never passthrough; ownership is uniform
`/list-numbers` SHALL serve exclusively from the reader; `/get-numbers/{id}`
merges the owned row with the live persona; the call read family SHALL
anchor on `GET /calls/{id}`, check the derived number in-fn, and return the
uniform 404 when foreign or missing (released numbers 404 their
artifacts); `/calls/{id}/recording` SHALL surface an upstream 302 as
`{location}` data; list endpoints project to the owned number.

#### Scenario: Release is a trigger, not a call
- **WHEN** `/release-numbers/{id}` runs
- **THEN** no upstream request is made; the result carries the derived
  release target and a `release_requested` body — the host workflow owns
  the actual teardown at paid-through

### Requirement: Webhooks
The provider SHALL declare account hook `number-events` (hmac-sha256 over
`${timestamp}.${rawBody}`, `x-saperly-signature`/`x-saperly-timestamp`,
tolerance 300 s; NO subscribe — the host logs the callback URL for manual
dashboard registration). Correlate: `call.received` → alias by
`payload.to`; live `call.*` → run by callId; `numberId` → resource target.
Dispatch: `call.received` → run `saperly#inbound-calls` (runKey callId,
admit-overdraft); `message.received` → run `saperly#inbound-messages`
(bill-only); `call.completed`/`call.recording.saved` → signal-run;
`number.*` → refresh; `message.sent`/`message.finalized` → ignore.

#### Scenario: Duplicate deliveries converge
- **WHEN** the vendor redelivers a `call.received` event
- **THEN** the same runKey (callId) yields the same deterministic run

## HOST obligations (recorded, implemented in monid-services)

- ResourceReader implementation (workspace-scoped ownership pointers,
  E.164 alias pointers, run-correlation lookup).
- The rent + variable billing loops exactly as shipped in MON-298 (hold
  sessions, cadence grid, strict runway verdict, two clocks, boundary/tail
  settlement, HOLD_FAILED/HOLD_SHORTFALL + mismatch events), plus the
  derived reconcile tick (grow-only, out-of-grid) and the CALENDAR-anchor
  first-period pro-ration rule.
- Webhook ingress: routing rows, boot reconcile, deterministic callback
  URLs, signed-delivery-id dedup, dispatched-run billing identical to
  user-started runs.
- Hosted policy keeps `/sync-numbers`, `/inbound-messages`,
  `/inbound-calls` out of catalogs and rejects direct runs (no doc-side
  visibility field, per prior D10).
