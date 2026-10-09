# Design: refine-resource-model

Decisions continue the D-numbering from `add-resource-lifecycle-saperly`
(D30–D37). Every decision here came out of the post-ship design review;
"v1" = monid-services.

## D38 — Enums are `z.enum(ConstObject)`; anchor says what it means

The new enums (`PeriodAnchor`, `ResourceInteraction`, `StopKind`) use
zod 4's const-object form (`z.enum(PeriodAnchor)` — the monid-services
`ResourceSlug` pattern) instead of `z.enum(Object.values(X) as [...])`.
`PeriodAnchor` values rename to `CREATION_TIME | CALENDAR` (default
`CREATION_TIME`): "CREATION" alone read as an event, not a time basis.
Pre-existing enums (RunKind, Unit) are untouched — byte-identity of
released docs beats uniformity.

## D39 — Resource `usage` is a RATE CARD; `reconcileUsage` is the sync

The review's sharpest point: endpoints keep the rate card (`usage.model`,
pure data) apart from execution; resources had mixed the card with the
meter. Split restored:

- `usage` (REQUIRED): `{ period, lines }` — pure data, hash-covered,
  priceable without executing anything. `period` is ONE top-level clock
  (`{unit, count, anchor}`); `lines` is a map of named lines, each either
  FIXED (`{consumes}` — a set draw per period, amount 0 lawful: a free
  resource is a $0 line with a real clock, so the host lifecycle always
  has a period boundary to continueAsNew on) or ESTIMATED
  (`{price: {unit, every, consumes}}` — a display card; the truth comes
  from reconciliation).
- `reconcileUsage` (per estimated line): `{ everyMs, get }` — `get` is the
  EFFECTFUL cumulative meter (`{consumes, vendorConsumes?}` since period
  start), `everyMs` the reconcile cadence (floor 1 h — the same
  Temporal-history bound as v1). Compiler: keys ⊆ estimated lines; every
  estimated line has a reconciler.
- ONE period, deliberately not per-line: the host workflow gets ONE clean
  cut — settle every line at the period end (fixed lines re-report;
  reconcile sessions close safely because `get` is cumulative), THEN
  continueAsNew. Mid-period events are 1 h-floored ticks, so history stays
  bounded. A resource that truly needs two settle clocks ships as two
  resources. (HOST obligation: settle-then-CAN at the period boundary.)
- Host charging policy is GONE from defs: `chargeLeadMs`, `releaseLeadMs`
  (charge/release leads), `buffer` (hold runway), `holdCadenceMs` (the
  hold session grid — replaced by `reconcileUsage.everyMs`, which is a
  REPORTING cadence). Leads and runway are HOST config per resource kind
  (obligation recorded in the spec deltas). This repo reports usage in the
  provider's native credits; the broker prices; the host charges.
- `resourceUsage.free()` — a plain DATA helper (not a fn-preset; presets
  are for fnTable fns) returning the $0 monthly card.

## D40 — The estimate re-runs; `accrue` dies (v1 shape restored)

"The price is an estimation and it syncs once in a while" is v1's
`paymentLifecycle.estimate({elapsedMs}) + accrueIntervalMs` — the split
into a separate `accrue` fn was ours, and it was needless. Restored:

- `zEstimateData` gains `elapsedMs: number().nonnegative().optional()` —
  validated per call by the SAME z.function contract as today; the typed
  layer gains `elapsedMs?: number`. Still a pure fn of its data.
- The doc declares `usage.updateEstimateEveryMs`: PRESENT = "this estimate
  varies over the run; re-run it on this cadence while RUNNING"
  (compile-checked ⇒ lifecycle.poll resolves; metered model required).
  ABSENT = a static promise, evaluated once. The engine never infers
  time-basedness — the doc says it.
- Initial estimate for unbounded inputs (saperly place-calls): the fn's
  own floor — `elapsedMs` is ABSENT at admission, so
  `max(ceil((elapsedMs ?? 0)/1000), 60)` = 60 s. The AUTHOR picks the
  admission floor; it is the def's promise.
- Engine: `accrued(input, elapsedMs)` is now sugar for
  `estimate(input, elapsedMs)`; `usage.accrue` (fn, intervalMs, buffer)
  is deleted everywhere.

## D41 — `ops` → `lifecycle`; `check` → `verify`; the instance is `resource`

A resource literally has a lifecycle (alive? → re-sync → teardown); the
word fits it at least as well as it fits the endpoint's run protocol, and
"both are the def's effectful phase family" makes the overload a feature.
`check` → `verify` (v1's word; it verifies aliveness before every
charge). The fn-facing instance shape renames from backend-speak:
`ResourceRow` → **`OwnedResource`**, ctx.data field `row` → **`resource`**
(`data.resource.externalId`, `data.resource.data` — symmetric with the
def's `data` schema). `target` dies from op ctx (always derivable:
`{doc.id, resource.externalId}`); targets survive only where genuinely
cross-doc (seeds, webhook routing, settle marks).

## D42 — `externals` → `views`; `display` and `utils.external` die

`views?: Record<kind, { label?, read }>` — a named LIVE view of the
upstream object. `label` is the human name (v1's externalRef label);
`display` is gone (what shows where is the host's call). `utils.external`
is gone too: a meter that wants the same read as a view writes the same
four-line `utils.http` call — a simpler ABI beats deduplicating five
lines (fns are closed terms; there was no honest sharing mechanism
anyway). Kind keys stay kebab-case (repo-wide identifier convention).

## D43 — Bindings are purpose-keyed arrays; gated instances ride as data

`resource:` (one block, interaction enum) → `resources:` keyed by
PURPOSE, every purpose an ARRAY (uniform shape):

    resources: {
        provisions?: [{ id, seed }],              // ≤1 (compile-checked)
        uses?:     [{ id, key?, as?, ensure? }],
        updates?:  [{ id, key,  as? }],
        releases?: [{ id, key,  as? }],
        reads?:    [{ id, key?, as?, ensure? }],
    }

Each purpose gets its OWN schema — `seed` exists only under provisions,
`key` is required exactly where the settle mark needs a target
(updates/releases); invalid combos are unrepresentable. Ordering: within
a purpose = declaration order; ACROSS purposes = canonical
uses → updates → releases → reads (safe to fix: gates are all-must-pass
with ONE uniform 404 — first-miss identity is unobservable; only
determinism matters). `data.resources` (lifecycle fns only; pure hooks
stay input-only) carries EVERY gated instance from EVERY purpose — each
entry whose `key` resolved and passed the gate — keyed by `as`
(default: the key path's last segment; unique across purposes).
Key-less uses/reads entries gate nothing and contribute nothing; they
grant the reader window + ensure/marks only. Settle marks: union across
entries (provisions → seeds; uses → reconciles; updates → refreshes;
releases → releases).

## D44 — Webhooks: flat, one `route` fn, template verify

- The `account:` wrapper dies — scope is POSITIONAL (provider-def hooks
  are account-scope; resource-def hooks are resource-scope):
  `webhooks: { "<slug>": { verify, route, subscribe?, unsubscribe? } }`.
- `correlate` + `dispatch` merge into ONE pure
  `route(delivery) → { who, what }` — both were pure reads of the same
  delivery with no host step between them. `who` keeps the correlation
  vocabulary (resource/alias/run/unhandled), `what` the action vocabulary
  (run/signal-run/refresh/ignore).
- `unsubscribe` is retained and matters: account-scope, called when a
  slug leaves the doc (reconcile); resource-scope, called during RELEASE
  teardown so vendor registrations die with the instance.
- `verify.payload` generalizes from the pinned literal to a TEMPLATE
  (any composition of `${timestamp}` / `${rawBody}` / literals; must
  contain `${rawBody}` — schema-checked).

## D45 — Explicit slugs + the identity lock

- ResourceDef gains REQUIRED `slug` (kebab); the loader asserts
  folder === slug (the provider `name` pattern). Id stays
  `<provider>/<slug>`; folder inference dies.
- Endpoint `endpoint:` STAYS optional (`?? request.path`, trailing
  slashes stripped — the default is reasonable and a required field
  would tax every def). AMENDED post-review: an earlier revision made
  it required + swept every def; reverted — the ids.lock below already
  turns a silent derived-id drift into a CI failure.
- Stability guard: a committed `connectors/ids.lock.json` (sorted
  provider/endpoint/resource/webhook ids) + `deno task ids:check` —
  verifies every locked id still compiles; removals/renames fail unless
  the lock is regenerated via `ids:check --update` (a reviewable diff in
  the PR). Uniqueness stays structural (bundle maps + compiler collision
  errors + folder===slug at the loader).

## D46 — The local host loop: `IResourceStore` + Deno KV; tunnels are tooling

- `IResourceStore` (engine interfaces — the port; adaptors under
  `scripts/store/`): speaks the RESOURCE VERBS —
  `provision(resource)`, `refresh(id, externalId, data)`,
  `release(id, externalId)`, `get(id, externalId)`, `list()`, plus the
  inherited `owned(query)` (it EXTENDS ResourceReader, so monid-services
  plugs its existing reader + three writes).
- Default adaptor: **Deno KV** (`Deno.openKv(".output/local.db")`) —
  zero deps, atomic, sqlite-backed locally; the `--unstable-kv` flag is
  wired into deno.json task definitions so users never type it.
- `engine:run`: reader served from the store; provision seeds and settle
  effects (releases/refreshes/reconciles) applied back through it;
  `--resources file.json` remains as a one-off override (bypasses the
  store).
- `scripts/webhook.ts simulate <provider> <slug>`: signs a payload per
  the COMPILED doc's verify descriptor (works for any provider), runs
  `route`, prints — and with `--execute` performs — the action against
  the local store/engine. `listen`: a minimal `Deno.serve` ingress for
  REAL vendor deliveries behind a `TunnelAdaptor` interface
  (`start(port) → {url}` / `stop()`): `cloudflared` (default,
  zero-account quick tunnel), `tailscale` (stable ts.net URL — kills the
  dashboard re-paste loop), `none`. Tunnels live in scripts ONLY — the
  engine's one network seam remains Transport.

## D47 — Saperly carry-overs

Flat-monthly confirmed against the live OpenAPI spec (no proration,
no refunds; quote = monthly + upfront cents). The 409-requote consent
retry stays (`approveHigherPrice: true` would auto-accept unbounded price
changes). `subscribe` via saperly's NEW workspace-webhooks API
(`POST /workspaces/{slug}/webhooks`) is deferred until the host supplies
the workspace slug. `meta.notes` money warnings stay.
