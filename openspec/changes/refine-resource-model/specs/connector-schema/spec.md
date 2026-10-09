# connector-schema (delta)

## MODIFIED Requirements

### Requirement: Resource usage is a rate card with a reconcile sibling
`zResourceDef` SHALL replace `billing` with a REQUIRED `usage` section —
pure data: one top-level `period {unit, count, anchor: CREATION_TIME |
CALENDAR}` and a `lines` map where each named line is exactly one of
FIXED (`{consumes}`, amount ≥ 0) or ESTIMATED (`{price: {unit, every,
consumes}}`). A sibling `reconcileUsage` section SHALL declare, per
estimated line, `{everyMs ≥ 3_600_000, get}` where `get` is the effectful
CUMULATIVE meter returning `{consumes, vendorConsumes?}`. `chargeLeadMs`,
`releaseLeadMs`, `buffer`, and `holdCadenceMs` SHALL NOT exist in defs
(HOST obligations: charge/release leads and hold runway are host config;
the host settles all lines then continues-as-new at the ONE period
boundary). A `resourceUsage.free()` data helper SHALL provide the $0
monthly card.

#### Scenario: Free resource still has a clock
- **WHEN** a def declares `usage: resourceUsage.free()`
- **THEN** it compiles with a MONTH/1/CREATION_TIME period and one fixed
  line of amount 0 — the host lifecycle has a period boundary

#### Scenario: Estimated line without a reconciler
- **WHEN** a def declares an estimated line with no matching
  `reconcileUsage` entry
- **THEN** compilation fails naming the line

### Requirement: Resource ops are the lifecycle family
The resource def section SHALL be named `lifecycle` with fns `verify`
(was `check`), `release`, and optional `refresh`. Op ctx.data SHALL be
`{ resource }` where `resource` is the `OwnedResource` instance
(renamed from `ResourceRow`; fields `resource` id, `externalId`, `data`,
`syncedAt?`); meters receive `{ resource, window }` and views
`{ resource, args? }`. A separate `target` SHALL NOT ride in op ctx.

#### Scenario: Verify reads the instance id
- **WHEN** `lifecycle.verify` runs for an owned instance
- **THEN** the fn reads `data.resource.externalId` and no `target` field
  exists in ctx.data

### Requirement: Views replace externals
The resource def SHALL declare live reads as
`views?: Record<kind, { label?, read }>` (kebab kinds). `display` SHALL
NOT exist (host concern) and `utils.external` SHALL NOT exist (a meter
performs its own reads).

#### Scenario: View with a label
- **WHEN** a def declares `views: { connection: { label: "Connection",
  read } }`
- **THEN** the compiled doc carries the label and a `read` fn ref only

### Requirement: Endpoint estimates re-run instead of accruing
`zEstimateData` SHALL carry optional `elapsedMs` (nonnegative), validated
by the same estimate contract; the typed layer SHALL type it. The
endpoint usage section SHALL declare optional `updateEstimateEveryMs`
(the re-run cadence while RUNNING) and SHALL NOT declare `accrue`.

#### Scenario: Admission estimate of an unbounded run
- **WHEN** the engine estimates at admission
- **THEN** `elapsedMs` is absent and the fn's own floor prices the hold

### Requirement: Bindings are purpose-keyed arrays
The endpoint def SHALL declare `resources:` keyed by purpose —
`provisions`, `uses`, `updates`, `releases`, `reads` — every purpose an
ARRAY. `seed` SHALL exist only on provisions entries; `key` SHALL be
required on updates/releases entries; `ensure` SHALL exist on uses/reads
entries; each gated entry MAY carry `as` (default: the key path's last
segment; unique across purposes). At most ONE provisions entry SHALL
compile.

#### Scenario: Two uses of the same resource kind
- **WHEN** an endpoint declares two `uses` entries with distinct keys and
  aliases
- **THEN** both gate independently and both instances ride into lifecycle
  fns

### Requirement: Webhooks are flat with one route fn
Provider and resource defs SHALL declare
`webhooks: Record<slug, { verify, route, subscribe?, unsubscribe? }>`
(no `account` wrapper — scope is positional). `route` SHALL be ONE pure
fn returning `{ who, what }` with the existing correlation and action
vocabularies. `verify.payload` SHALL be a template string containing
`${rawBody}` AND `${timestamp}` (any composition with literal glue) —
freshness must be BOUND to the HMAC, or `toleranceMs` is replayable.
`verify` MAY declare `signaturePrefix`: literal text the vendor puts
BEFORE the hex digest in the signature header (saperly: `v1=<hex>`);
absent = the header is the bare hex, and a header missing a declared
prefix is a mismatch. Verification is signature-FIRST with a
constant-time comparison, then the tolerance window — timing must not
distinguish stale-but-valid from fresh-but-invalid.

#### Scenario: Route answers who and what together
- **WHEN** a verified delivery is routed
- **THEN** one fn call yields the correlation AND the action

### Requirement: Explicit slugs
`zResourceDef` SHALL carry a REQUIRED `slug` (kebab) and the loader SHALL
assert folder === slug. The endpoint def `endpoint` field SHALL remain
OPTIONAL, defaulting to `request.path` with trailing slashes stripped
(amended post-review: the ids.lock guard makes derived-id drift a CI
failure, so requiring the field would only tax every def).

#### Scenario: Folder/slug drift
- **WHEN** `resources/phone-number/resource.ts` declares `slug: "phone"`
- **THEN** loading fails naming both

## REMOVED Requirements

### Requirement: Resource billing (rent/variable with leads and holds)
**Reason**: replaced by the usage rate card + reconcileUsage split;
charging policy moved to the host.
**Migration**: unreleased family; saperly rewritten in this change.

### Requirement: usage.accrue
**Reason**: merged into the estimate (`elapsedMs` + updateEstimateEveryMs
— the v1 shape).
**Migration**: saperly call endpoints rewritten in this change.
