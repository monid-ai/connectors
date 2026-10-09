# Design: add-resource-lifecycle-saperly

> AMENDED by `refine-resource-model` (D38–D47), which reshaped several of
> the surfaces decided here AFTER review: `billing` → the `usage` rate
> card + `reconcileUsage`; `ops.check/release/refresh` →
> `lifecycle.verify/release/refresh`; `externals` → `views`;
> `ResourceRow` → `OwnedResource`; the singular `resource:` binding →
> purpose-keyed `resources:` arrays; `usage.accrue` → the estimate
> re-run (`updateEstimateEveryMs` + `elapsedMs`); folder-inferred ids →
> the authored `slug`. The D-numbered prose BELOW is the original
> decision record — read it with that mapping; the FINAL contracts live
> in the refine change's design and in both changes' spec deltas.

Decision numbering continues the repo record (founding change D1–D29,
add-async-run-protocol D1–D29 in its own file). Provenance: monid-services
main (incl. MON-298 `resource-billing-lifecycle`), the saperly adaptor
(`services/shared/providers/adaptors/saperly/*`), and — as mechanism
references only — the `provider-agentmail` and `monid-provider-smolmachine`
worktrees.

## Background (the expressiveness bar)

**v1 endpoint↔resource verbs** (`models/providers/endpoints/def.ts:181-291`):
`requires` (preflight ownership → uniform 404), `provisions` (run created
resources → seeds; unreadable 2xx throws → PROVISION_FAILED park, run
uncharged), `ensureProvisioned` (provision-if-missing; `[]` = satisfied;
deterministic ids are the race lock), `releases` (release trigger; the run
makes NO upstream call — the workflow's cancel is the mechanism),
`refreshes` (post-run row re-sync), `readsResources` (reader capability
key). Users: saperly (all but ensure), sfs (ensure + reads).

**v1 resource defs in scope**: saperly `phone-number` ($2/mo prepaid,
renewLead 3 d, releaseLead 6 h, verify/release/refresh + live inspect of the
embedded connection) and sfs `file-system` ($0 schedule, silent advance,
non-releasable, verify = health probe; the 1 GiB quota is def-side at /put).

**MON-298 mechanics adopted verbatim** (interface cleaned up — D30..D33):

- Rent (prepaid, sticky, per period) + variable cost (a hold-session stream).
- ONE cumulative `getActualCost(window)` — the window always starts at the
  usage-period start, so the platform never differences two readings.
  Callers: every `holdCadence` tick (`[periodStart, now)`), the usage-period
  boundary (full period — the ONLY settle moment, even $0), the release tail
  (read AFTER upstream teardown; must tolerate post-mortem reads).
- Hold session per `(resource, cycle)`: opens at exactly `buffer`, each tick
  grows it to `incurred + buffer`, never shrinks; unspent headroom returns at
  settle. Cadence floor 1 hour (Temporal-history cap).
- Insufficient funds: refused grow → HOLD_FAILED event (alone never
  releases); refused AND strictly `incurred > held` → runway exhausted →
  immediate release. The platform never loses money.
- Two clocks: rent prepays on its own schedule; usage settles at its own
  boundary. Failed rent: RENEW_FAILED + backoff → unpaid release at
  `releaseAt`.
- Coherence: variable billing requires a rent schedule ($0 fine — it IS the
  clock) and a release op.

**Mechanism references** (ports out of scope): agentmail — storage as
variable billing (card $1/GB-month, cadence 1 day, buffer $0.10; the meter
shares its reader with the inspect surface so preview == bill), effectful
ensure that mints a real upstream object, webhook → billed run
(`bill-only`). smolmachine — non-renewable resource (no billing block:
admit, idle until release), bounded metered runs (hold = the caller's own
declared ceiling; no accrual clock), release call doubles as the vendor's
final settled invoice, upstream TTL-reap tolerated as success.

## D30 — Resources are first-class defs, compiled like endpoints

`defineResource` → `zResourceDef` → compiled `zResourceDoc`, a module beside
`endpoints/` (`resources/<name>/{resource.ts, schema/, resource.test.ts,
fixtures/}`), id `<provider>/<name>` inferred from the folder, never
authored. The def declares:

- `meta` — zBaseMeta (displayName/summary/description/notes/docsUrl).
- `data` — the stored ROW snapshot as a live zod schema (JSON Schema on the
  doc); types every row appearance (ops, seeds, refresh patches).
- `inputs` — the REQUIRED inputs to `create`/`update`/`release` this
  resource. The contract is owned by the RESOURCE: the compiler checks that
  any endpoint bound to that operation accepts a superset.
- `billing` — D31.
- `ops` — platform-driven effectful fns (same ctx/utils/error taxonomy as
  lifecycle fns): `check` (aliveness before every charge — v1 verify),
  `release` (idempotent teardown; MAY return the vendor's settled final
  bill), `refresh?` (re-sync → row patch).
- `externals` — D33. `webhooks` — D36.

Compiled `zResourceDoc` mirrors `zEndpointDoc`: `{specVersion, id, provider,
minEngineVersion, meta, dataSchema, inputs?, billing? (getActualCost as $fn
ref), ops + externals as $fn refs, webhooks?, auth (fused from the
provider), request: {url} (origin carrier for `utils.http` paths), hash}`.
The bundle gains a `resources` map with the same both-direction fn closure;
each resource runs as a sealed unit via `engine.loadResource(unit)`.

Op outcomes, mapped from the v1 shapes
(`services/shared/models/providers/resourceDef.ts`):

| v1 | v1 shape | ours |
| --- | --- | --- |
| `verify` | `{active, inactiveReason?, cost?: MonetaryValue, providerPeriodEnd?: Date}` (:29-49) | `check → {active, inactiveReason?, periodEndIso?, observed?: {consumes?}}` |
| `release` | `Promise<void>`, 404/410 = success | `release → {released: true, settled?: {consumes}}` (+ smolmachine's teardown-as-invoice) |
| `refresh` | full-field override patch | `refresh → {active, patch?: DataOf<def>}` (typed) |
| `externalKinds[k].inspect` | live `JSONExtendedType`, never persisted (:280-295) | `externals[k].read → Json` |
| `billingLifecycle.getActualCost` | `VariableCost {amount, actualCost?}` (:209-217) | `{consumes, vendorConsumes?}` |

Rejected alternative: keeping resources as data blobs inside the provider
def — loses per-resource testing, fn interning, and the endpoint/resource
symmetry that makes the authoring surface learnable.

## D31 — Resource billing: rent + variable, credits vocabulary

`zResourceBilling` = `{period, rent?, variable?}` with the compile rule
`variable ⇒ rent present ($0 fine) AND ops.release present`.

- `period: {unit: DAY|WEEK|MONTH|YEAR, count, anchor: CREATION|CALENDAR
  (default CREATION)}`. CREATION = rolling from the provision moment (v1
  behavior — saperly, agentmail). CALENDAR = UTC calendar boundaries for
  vendors that invoice on calendar periods (smolmachine-class); HOST rule:
  the FIRST period is the partial remainder from creation to the next
  boundary — rent pro-rated, variable settled over the short window — then
  full periods tile.
- `rent: {consumes: {credit, amount ≥ 0}, chargeLeadMs, releaseLeadMs}` —
  set price per period, charged IN ADVANCE; period 1 is charged by the
  CREATING run's own usage model; sticky; the host charges
  `max(card, seed.rentConsumes)`; amount 0 = free schedule (silent advance).
- `variable: {price (display card only — the bill is getActualCost's
  answer), holdCadenceMs ≥ 3_600_000, buffer: zConsumes, getActualCost}` —
  the dynamic-cost stream. `getActualCost` ctx:
  `{data: {target, row: DataOf<def>, window: {startIso, endIso}}, utils,
  logger}` → `{consumes, vendorConsumes?}`, CUMULATIVE from the usage-period
  start. A throw RETRIES — settle late, never silently $0. The bill and the
  preview share ONE reader by construction: `getActualCost` calls
  `utils.external(kind, args)` (D33) instead of duplicating vendor-metrics
  logic.

Host loop (spec-recorded obligations, all shipped in MON-298): session opens
at `buffer` at admit; each cadence tick grows to `incurred + buffer`;
refused grow → HOLD_FAILED; refused AND `incurred > held` strictly →
release; usage settles ONCE at its boundary on its own junction; rent
prepays independently; release tail settles pro-rata after teardown and
never wedges; held/estimate-vs-settled → mismatch events (the resource twin
of run evidence-vs-estimate).

Rejected alternatives: named per-usage meters with windowed differencing
(the agentmail-worktree draft — superseded by MON-298's one cumulative
answer); settling variable cost via lifecycle-SPAWNED runs (built and
deleted in that draft — ONE money channel through the host wallet path).

## D32 — Endpoint ↔ resource: ONE derived binding

The endpoint def gains `resource?: zResourceBinding =
{id, interaction: CREATES|USES|UPDATES|RELEASES|READS, key?, seed?,
ensure?}`. Everything v1 authored as separate verbs is DERIVED:

| interaction | derived |
| --- | --- |
| CREATES | `seed` (pure `({input, output}) → {externalId, identifier?, data, rentConsumes?} \| null`) runs post-settle on 2xx → `RunCompleted.resources.provisions`; a throw on an unreadable 2xx → `PROVISION_CONSTRUCT` (host parks, run uncharged); compiler checks endpoint input ⊇ resource `inputs.create` |
| USES | `key` present → ownership pre-gate (uniform 404 COMPLETED on miss, zero usage); post-run reconcile tick when the resource bills `variable` (grow-only, out-of-grid — additive over v1's cadence-only loop) |
| UPDATES | ownership pre-gate + post-run refresh target; input ⊇ `inputs.update` |
| RELEASES | ownership pre-gate + release trigger on the result (the host cancels the workflow; the run makes NO upstream call); input ⊇ `inputs.release` |
| READS | reader capability only |

`key` is a JSONPath into the VALIDATED input (e.g. `$.body.fromNumberId`);
required for UPDATES/RELEASES, optional for USES/READS (absent = the fn
derives ownership in-code via `utils.resources` — the anchor pattern).
`ensure` (v1 ensureProvisioned) is effectful
(`({input, scope: {key}}, utils: {http, request, resources})` → seeds; `[]`
= satisfied), runs BEFORE start, may mint real upstream objects;
`data.scope.key` is an OPAQUE host namespace token for deterministic
identities (the race lock) without the engine learning tenancy.

Reader enforcement, BOTH directions: at runtime `utils.resources` exists
only when a binding is declared (otherwise a throwing stub —
`RESOURCES_UNDECLARED`; the capability is structurally withheld); at compile
a binding whose derived behaviors and reader are all unused is a dead
declaration (rejected, same posture as the dead-`pollMs` lint).

Rejected alternative: keeping the v1 per-verb fns — six authoring sites per
endpoint where one declaration suffices, and `requires` forced fns into
preflight where a JSONPath is enough.

## D33 — Externals: named always-live reads

`externals: Record<kind, {read, display (default false)}>` replaces a single
`inspect`. The v1 purposes are kept: (1) always-live data with zero lag —
the stored row may be stale; (2) live data at billing time. Billing/op fns
receive `utils.external(kind, args?)`, which runs the doc's OWN compiled
reader — the bill and the preview share one reader BY CONSTRUCTION (the
shipped agentmail invariant). Multiple kinds per resource; `display: true`
kinds are the host-exposed detail surface; `display: false` kinds are
internal-only (not all live data needs showing).

## D34 — Metered runs: `usage.accrue` + stop reporting + run identity

- `usage.accrue: {intervalMs, counts (pure `({elapsedMs, usage:{model}}) →
  {counts}`), buffer?}` (endpoint ?? provider; compile: accrue ⇒
  lifecycle.poll). Engine gains ONE pure method beside `estimate`:
  `accrued(elapsedMs): Usage` — fn counts + buffer, validated against the
  model, folded through `assembleUsage`. The HOST loop holds
  `price(estimate)` at admit and tops up to `price(accrued(elapsed))` every
  `intervalMs`; top-up impossible → `stop()` and settle what settled.
  Bounded runs (caller declares a ceiling) need NO accrue — `estimate`
  alone sizes the hold (smolmachine mechanism).
- Stop learns to report (the reserved `unresolved` lands): `LifecycleStopFn`
  may return `void | LifecycleCompleted | {kind: "UNRESOLVED"}`; engine
  `stop()` → `COMPLETED` (stop-side settle through the ONE pipeline) /
  `UNRESOLVED` (host bills its elapsed-based last resort) /
  `STOPPED_UNSETTLED` (void — today's behavior, named).
- `utils.sleep(ms)` (EngineCtx.sleep-backed, instant in replay, per-phase
  budget capped) for stop's bounded settle-wait.
- Run identity: `start/poll/stop` gain optional trailing
  `run?: {runId?: string}`; `data.run = {runId}` joins lifecycle ctxs; fns
  write deterministic dedupe headers (`Idempotency-Key: <runId>:<op>` — the
  v1 convention) so activity retries converge upstream instead of buying a
  second number. `run()`/CLI mint a ULID when the host passes none.

## D35 — Engine surface

- `EngineCtx.resources?: ResourceReader` —
  `owned(sel: {resource, externalId?}) → Promise<ResourceRow[]>`; the host
  binds workspace scope; the engine never sees tenancy. Declared binding +
  no reader → `NO_RESOURCE_READER` at load. CLI: `engine:run --resources
  <file>` (JSON store); the default reader returns `[]` (the uniform-404
  posture holds locally).
- Loaded-endpoint start order: validateInput → derived ownership gate →
  `ensure` (seeds surfaced on `RunStartResult.ensured` BEFORE execution —
  v1 ordering) → lifecycle/declarative execution → settle → derived
  post-run outputs on `RunCompleted.resources = {provisions?, releases?,
  refreshes?, reconciles?}`.
- `engine.loadResource(unit)` → `{check, release, refresh, actualCost,
  external}`, each `(target, row[, …])`; resource-op fns receive
  `utils.external` bound to the SAME loaded doc.
- New error codes: `NO_RESOURCE_READER`, `RESOURCES_UNDECLARED`,
  `PROVISION_CONSTRUCT`, `RESOURCE_OP_FAILED`.
- `TransportResponse`/`HttpResult` gain `headers?` (lower-cased; redirects
  already never followed) — call-recording surfaces the 302 `location` as
  data. `utils.json.deepOmit(json, keys)` joins JsonUtil (saperly's shared
  success+error nested strip).

## D36 — Webhooks: v1's binding model, declared on docs

v1 (services/webhooks): ONE ingress route `POST /v1/providers/:provider/*`;
the path remainder IS the binding (`account/{slug}` |
`resource/{resourceId}/{slug}` | reserved `run/{runId}/{slug}`); the only
stored state is a routing row. Verify = signature over EXACT raw bytes
(paths are guessable by design). Account hooks reconcile at BOOT (code =
truth; manual providers get the callback URL logged to paste — saperly).
Resource hooks are asserted at ADMIT, re-asserted each period, revoked at
release. Callback URL = a pure function of the binding. Deliveries dedup on
the SIGNED delivery id (`webhook:{provider}:{deliveryId}`); dispatched runs
get deterministic ids from `runKey ?? deliveryId`.

Doc side: the PROVIDER def gains `webhooks.account: Record<slug, {verify
(declarative HMAC descriptor — the host executes it), correlate (pure →
{kind:"resource",target} | {kind:"alias",e164} | {kind:"run",externalRunId}
| {kind:"unhandled",event}), dispatch (pure → {action:"run", endpoint,
input, runKey?, controlPolicy?: "bill-only"|"admit-overdraft"} |
{action:"signal-run", runKey} | {action:"refresh", target} |
{action:"ignore"}), subscribe?/unsubscribe? (effectful, when the vendor has
a registration API)}>`. The RESOURCE def gains the per-resource scope with
`subscribe` REQUIRED. The `{action:"run"}` arm IS "a resource starts a
run": correlate resolves the owning workspace, the host starts the endpoint
there, its start ADOPTS the external id, and the run bills like any other.

## D37 — Saperly port map (17 endpoints, 1 resource)

| endpoint | binding | model | lifecycle |
| --- | --- | --- | --- |
| /provision-numbers | CREATES + seed | PER_CALL $2 | start = the 4-call saga (quote → connection-first → consent purchase → one 409 PriceChanged retry → bind w/ degrade+repair); consolidate claims the stamped consented quote |
| /release-numbers/{id} | RELEASES key $.body.numberId | FREE | local COMPLETED 202 — no upstream call |
| /list-numbers | READS | FREE | start serves from `utils.resources.owned()` only |
| /get-numbers/{id} | READS key $.pathParams.id | FREE | row + live persona read |
| /update-numbers/{id} | UPDATES key $.pathParams.id | FREE | PATCH connection; missing/stale ref → repair (create+bind) |
| /sync-numbers | UPDATES key $.pathParams.id | FREE | relay; derived refresh re-syncs the row (webhook-triggered; host-internal) |
| /list-voices, /list-languages | — | FREE | declarative relays |
| /place-calls | USES key $.body.fromNumberId | PER_UNIT SECOND every 60 @ $0.28 + accrue(30 s, floor 60 s, buffer 60 s) | start relay w/ runId key → RUNNING(externalRunId=callId); poll = settle-race grace via `graceLeft` countdown; stop = hangup + bounded settle-wait → UNRESOLVED |
| /list-calls, /get-calls/{id}, /calls/{id}/transcript, /calls/{id}/recording | USES (no key — anchor) | FREE | anchor start: GET the call, check the number in-fn, uniform 404 when foreign (pointer-is-liveness); recording reads the 302 `location` |
| /send-messages | USES key $.body.fromNumberId | PER_CALL $0.025 | declarative relay |
| /list-messages | USES key $.queryParams.numberId | FREE | relay + owned-number projection |
| /inbound-messages, /inbound-calls | — (webhook-dispatched; host-internal) | PER_CALL $0.025 / call metering | inbound-calls start ADOPTS the event callId; poll/stop shared with place-calls by content dedupe |

Resource `saperly/phone-number`: billing rent $2/MONTH (CREATION anchor,
chargeLead 3 d, releaseLead 6 h), no variable; ops check/release/refresh
(connection pointer AUTHORITATIVE — absence clears; carry-forward on
degraded reads); external `connection` (display) = the live sanitized
persona. Webhooks: account `number-events` (HMAC over
`${timestamp}.${rawBody}`; correlate: call.received → alias by payload.to,
live call.* → run by callId, numberId → resource target; dispatch:
call.received → run inbound-calls (runKey callId, admit-overdraft),
message.received → run inbound-messages (bill-only), call.completed /
call.recording.saved → signal-run, number.* → refresh,
message.sent/finalized → ignore); NO subscribe (manual dashboard paste).
Money-moving endpoints carry `meta.notes`.

Carry-over gotchas (recorded so implementation cannot lose them):
connection-first ordering (fail before money moves); one PriceChanged retry
with a distinct idempotency key; degraded-bind → connection-less resource +
best-effort orphan delete + repair path; release 404/410-tolerant with a
stable per-resource key; refresh full-override with authoritative
connection pointer; `firstTerminalAt`-style settle-race grace (here a
deterministic `graceLeft` countdown — fns have no clock);
derive-seconds-from-settled-charge evidence fallback; released numbers 404
their call artifacts; the shared success+error `deepOmit` projection
(monthlyPriceCents, currency, nextChargeAt, connectionId, webhookUrl).

## Expressiveness proofs (not migrated here)

- sfs `file-system`: billing `{period MONTH/CREATION, rent $0 lead 0/0}`;
  endpoints bind `READS + ensure ensureDefaultFs` (local-only ensure, seed
  externalId `scope.key + ":default"`); cross-provider reuse (elevenlabs et
  al.) is the same binding on their endpoints.
- agentmail-class storage: rent $1/mo + variable {card $1/GB_MONTH, cadence
  1 d, buffer $0.10, getActualCost via `utils.external("storage",
  {window})`}; cost-moving endpoints bind USES → derived reconcile tick.
- smolmachine-class sandbox: resource with NO billing (admit → idle →
  release); bounded exec runs (estimate = caller ceiling, no accrue);
  `ops.release` returns `{released, settled}` from delete-with-usage;
  CALENDAR anchor available for calendar-invoicing vendors.

## Versioning

All additive; existing docs recompile byte-identical (acceptance-checked
against main — providers/endpoints/fnTable/taxonomy/minEngineVersion
unchanged; only git provenance fields differ).

RECONCILED AT IMPLEMENTATION (the original paragraph proposed bumping
`spec_version`/`doc_format_since`/`fn_abi_since`, which is INCOMPATIBLE
with the byte-identical acceptance scenario: all three are stamped into
every existing doc/fn entry, so bumping any of them rewrites every doc's
bytes and floors). What shipped instead:

- `spec_version` stays 1.0.0 and `doc_format_since` stays 0.0.3: every
  new doc field is optional, so old docs are untouched and old ENGINES
  reject new-family docs anyway (their strictObject refuses the new keys
  AND the 0.2.0 floor gates them).
- `fn_abi_since` stays 0.1.0: the ABI additions (ctx `run`, `utils.sleep`
  / `resources`, the stop-outcome voice) are strictly additive — an
  existing fn runs unchanged on the new engine. (`HttpResult.headers`
  landed on MAIN independently in the same release window — suzanne's
  redirect artifacts — and moved `async_since` to 0.2.0 there; the merge
  adopted main's contract: `headers` REQUIRED, `{}` when the transport
  surfaces none, fixture headers ALLOWLISTED.)
- NEW fact `schema.resources_since = 0.2.0` carries the whole family:
  stamped as the `api` of every resource-family fn (ops, externals,
  getActualCost, webhook fns, binding seed/ensure, accrue counts), the
  floor of every resource doc, and an explicit `minEngineVersion` floor
  for endpoint docs carrying a `resource` binding or `usage.accrue` even
  when they add no new fn.
- ENGINE_VERSION 0.1.0 → 0.2.0; `deno task version:check` guards.
