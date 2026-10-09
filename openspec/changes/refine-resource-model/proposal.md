# Proposal: refine-resource-model

## Why

The resource lifecycle shipped in `add-resource-lifecycle-saperly` went
through a design review. Verdicts: the model held, but several shapes were
backend-flavored where they should be author/user-flavored, the rate card
was mixed with sync machinery, host charging policy leaked into defs, and
the local story (persistence, webhooks) was missing. This change refines
the UNRELEASED resource family in place (no migration — saperly is the
only consumer) and adds the local host loop.

## What changes

- **Enums**: `z.enum(ConstObject)` (the monid-services pattern) for the
  new enums; `PeriodAnchor` values become `CREATION_TIME | CALENDAR`.
- **Resource usage = a RATE CARD** (renamed from `billing`, REQUIRED):
  `{ period, lines: { <name>: fixed | estimated } }` — pure data. The sync
  machinery moves to a sibling `reconcileUsage: { <line>: { everyMs, get } }`.
  Host charging policy leaves the def entirely (`chargeLeadMs`,
  `releaseLeadMs`, `buffer`, `holdCadenceMs` — HOST obligations now).
  `resourceUsage.free()` data helper for the $0 card.
- **Endpoint `usage.accrue` dies**: the estimate re-runs — `zEstimateData`
  gains `elapsedMs?` and the doc declares `usage.updateEstimateEveryMs`
  (the v1 `paymentLifecycle.estimate({elapsedMs})` shape restored).
- **`ops` → `lifecycle`**, `check` → `verify`; op ctx.data becomes
  `{ resource }` (the `OwnedResource` instance — `target` and `row` die).
- **`externals` → `views`**: `Record<kind, { label?, read }>`; `display`
  and `utils.external` die (the host decides display; a meter does its own
  reads).
- **Bindings purpose-keyed**: `resource:` → `resources: { provisions?,
  uses?, updates?, releases?, reads? }` (all arrays; ≤1 provisions
  compile-checked); gated instances ride into lifecycle fns as
  `data.resources[alias]`; canonical gate order uses → updates → releases
  → reads.
- **Webhooks**: the `account` wrapper dies (scope is positional);
  `correlate` + `dispatch` merge into ONE `route(delivery) → {who, what}`;
  `verify.payload` becomes a real template (must contain `${rawBody}` and
  `${timestamp}` — freshness bound to the HMAC).
- **Slugs + the identity lock**: ResourceDef gains required `slug`
  (folder === slug asserted); endpoint `endpoint:` STAYS optional
  (`?? request.path` — amended post-review: the default is reasonable);
  a committed `connectors/ids.lock.json` + `deno task ids:check` guard
  makes identity drift, removals and renames a deliberate, reviewable
  act.
- **Local host loop**: `IResourceStore` port (resource-verb methods:
  provision/refresh/release/get/list + owned) with a Deno KV default
  adaptor; `engine:run` persists seeds/effects through it;
  `scripts/webhook.ts simulate|listen` (signed synthetic deliveries; a
  minimal ingress behind a pluggable `TunnelAdaptor` —
  cloudflared/tailscale/none).

## What does NOT change

Endpoint run pipeline, usage models/settle, stop outcomes, fixtures
strategy, every pre-existing connector's COMPILED bytes (the `endpoint:`
sweep touches defs only). No monid-services coupling: the store and
tunnel are local tooling behind ports.

## Impact

- specs: connector-schema, connector-engine, connector-compiler,
  connector-testing, saperly-connector (amendments), local-host-loop (new)
- code: shared/core schema resource family, engine, compiler, testing,
  scripts, connectors/saperly, every connector def (endpoint: sweep)
