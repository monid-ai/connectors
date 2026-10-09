# connector-schema (delta)

## ADDED Requirements

### Requirement: Resource definitions are first-class
The schema SHALL provide `defineResource` → `zResourceDef`, authored at
`connectors/<provider>/resources/<slug>/resource.ts` with a REQUIRED
authored `slug` the loader asserts equals the folder name; the id is
`<provider>/<slug>`. The def SHALL declare `meta` (zBaseMeta), a `data`
snapshot schema (live zod, compiled to JSON Schema), optional `inputs`
schemas for create/update/release, the
REQUIRED `usage` rate card (+ `reconcileUsage`), `lifecycle` (`verify`
required, `release` required, `refresh` optional), optional `views`, and
optional `webhooks`.

#### Scenario: Instance typing flows from `data`
- **WHEN** a resource declares a `data` schema
- **THEN** op ctxs (`data.resource`), refresh patches, and provision seeds
  are typed by that schema at author time and validated by the engine at
  run time

### Requirement: Compiled resource docs are sealed units
The compiler SHALL emit `zResourceDoc` mirroring `zEndpointDoc`:
`{specVersion, id, provider, minEngineVersion, meta, data: {schema},
inputs?, usage, reconcileUsage?, lifecycle {verify, release, refresh?},
views?, webhooks?, auth, request: {url}, timeouts, hash}` with every fn as
a `$fn` ref in the shared fnTable. The doc schema SHALL re-enforce
reconcile coherence (reconciler keys === estimated-line keys) and the
id's `<provider>/` prefix SHALL equal `doc.provider` at the bundle. The
bundle SHALL gain a `resources` map with both-direction fn closure.

#### Scenario: A resource runs as a sealed unit
- **WHEN** a host seals `saperly/phone-number` with its fn entries
- **THEN** `engine.loadResource(unit)` links and gates it exactly like an
  endpoint sealed unit (BAD_DOC → UNSUPPORTED_DOC → UNKNOWN_FN →
  LINK_INTEGRITY → UNSUPPORTED_FN_ABI)

### Requirement: The resource usage rate card
`zResourceUsage` (REQUIRED on every def) SHALL declare ONE `period {unit,
count, anchor: CREATION_TIME|CALENDAR}` clock and named `lines`, each
FIXED (`{consumes}`, amount ≥ 0 — a $0 line is a lawful clock-keeper via
`resourceUsage.free()`) or ESTIMATED (`{price: {unit, every, consumes}}`).
A sibling `reconcileUsage {<line>: {everyMs ≥ 3_600_000, get}}` SHALL
cover EXACTLY the estimated lines; `get` is cumulative from the
usage-period start and returns `{consumes, vendorConsumes?}`. Host policy
(charge/release leads, buffers, hold cadence) SHALL NOT appear on defs.

#### Scenario: A $0 fixed line is a lawful schedule
- **WHEN** a def declares a fixed line with `amount: 0`
- **THEN** it compiles — the host silent-advances the period (sfs-class)

### Requirement: Endpoint↔resource purpose-keyed bindings
The endpoint def SHALL gain `resources?: {provisions? [{id, seed}] (≤1),
uses?/reads? [{id, key?, as?, ensure?}], updates?/releases? [{id, key,
as?}]}`. `key` is a JSONPath into the validated input; aliases (`as` ??
the key's last segment) are unique across purposes. `seed` is
provisions-only and pure; `ensure` (uses/reads) is effectful with
`data.scope.key` (an opaque host namespace token) and `utils.{http,
request, resources}`.

#### Scenario: Ownership is derived, not authored
- **WHEN** an endpoint declares `interaction: "USES", key:
  "$.body.fromNumberId"`
- **THEN** no `requires` fn exists anywhere; the engine derives the
  ownership pre-gate from the binding

#### Scenario: Resource-owned input contracts
- **WHEN** an endpoint binds CREATES/UPDATES/RELEASES
- **THEN** the compiler verifies the endpoint's input schema accepts a
  superset of the resource's corresponding `inputs` schema

### Requirement: Views are named always-live reads
`zResourceDef.views` SHALL be a record of `{label?, read}`. Reads are
effectful, never persisted, and served host-side via
`RunnableResource.view(kind, instance, args?)` — one reader per kind, no
second implementation to drift.

#### Scenario: One reader per kind
- **WHEN** a host renders a view and a meter needs the same upstream fact
- **THEN** both go through the doc's ONE compiled `views.<kind>.read`

### Requirement: Metered runs declare an estimate cadence
`usage.updateEstimateEveryMs` SHALL be declarable (endpoint ?? provider);
the ESTIMATE fn re-runs with `elapsedMs` set as the mid-run accrual
(`zEstimateData.elapsedMs?`). Declaring it SHALL require a resolvable
`lifecycle.poll` and a metered model.

#### Scenario: A cadence on a sync endpoint is dead config
- **WHEN** an endpoint declares `usage.updateEstimateEveryMs` and no poll
  resolves
- **THEN** compilation fails

### Requirement: Lifecycle ctx gains run identity and sleep; stop reports
Lifecycle ctx data SHALL gain `run: {runId}`; `LifecycleUtils` SHALL gain
`sleep(ms)`; `LifecycleStopFn` SHALL be allowed to return `void |
LifecycleCompleted | {kind: "UNRESOLVED"}`; `HttpResult` and
`TransportResponse` SHALL gain optional lower-cased `headers`.

#### Scenario: Deterministic idempotency keys
- **WHEN** a start fn sends `Idempotency-Key: data.run.runId + ":purchase"`
  and its activity is retried with the same runId
- **THEN** the upstream receives the identical key and dedupes the mutation

### Requirement: Webhooks are declared on docs
The provider def SHALL gain `webhooks.account: Record<slug, {verify
(declarative hmac-sha256 descriptor), correlate, dispatch, subscribe?,
unsubscribe?}>`; the resource def SHALL gain the per-resource scope with
`subscribe` required. Dispatch SHALL be the closed vocabulary `run
{endpoint, input, runKey?, controlPolicy?: bill-only|admit-overdraft}` |
`signal-run {runKey}` | `refresh {target}` | `ignore`.

#### Scenario: A resource event starts a run
- **WHEN** correlate resolves a delivery to an owned resource and dispatch
  returns `{action: "run", endpoint, input}`
- **THEN** the host starts that endpoint's run in the owning workspace,
  keyed by `runKey ?? deliveryId`, billed like any user-started run
