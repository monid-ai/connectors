# Proposal: add-resource-lifecycle-saperly

> AMENDED by `refine-resource-model` (D38–D47) — see the banner in
> design.md for the vocabulary mapping (billing→usage, ops→lifecycle,
> externals→views, singular binding→purpose-keyed arrays).

## Why

Resources were removed from the standard in the founding change (D19: "they
return with a concrete need, as their own change"). The concrete need is here:
**Saperly** — phone numbers rented monthly, live calls metered by the second,
webhook-driven inbound traffic — is monid-services' only provider that cannot
be ported without a resource standard. monid-services has meanwhile shipped
the platform half (MON-298 `resource-billing-lifecycle`: rent + variable-cost
hold sessions on two clocks), so the doc-side contract can be designed 1:1
against a mechanism that already runs in production.

## What Changes

- **Resources become FIRST-CLASS** — `defineResource` → `zResourceDef` →
  compiled `zResourceDoc`, mirroring endpoints end-to-end (folder-inferred id
  `<provider>/<name>`, same fnTable interning, sealed units, leaf-wise auth
  fusion). A resource declares its stored-row `data` schema, the REQUIRED
  `inputs` for create/update/release, its `billing` (rent + variable), its
  platform-driven `ops` (check / release / refresh), named always-live
  `externals` reads, and per-resource `webhooks`.
- **Resource billing** (`zResourceBilling`) — the clean declarative form of
  MON-298: a `period` (with CREATION|CALENDAR `anchor`), prepaid sticky
  `rent` (period 1 charged by the creating run), and a `variable` stream
  (display `price` card, `holdCadenceMs` ≥ 1 h, monetary `buffer`, ONE
  cumulative `getActualCost(window)`).
- **Endpoint ↔ resource: ONE derived binding** (`resource: { id, interaction,
  key?, seed?, ensure? }`, interaction ∈ CREATES|USES|UPDATES|RELEASES|READS)
  replacing v1's verb soup — ownership pre-gates, post-run refresh/release/
  reconcile triggers, and seed/ensure hooks are DERIVED by the compiler and
  engine from the declared interaction.
- **Engine**: a `ResourceReader` port + structurally-withheld
  `utils.resources` capability; the derived ownership gate (uniform 404 as
  data); `RunCompleted.resources` / `RunStartResult.ensured` outputs for the
  host; `loadResource(unit)` → `{check, release, refresh, actualCost,
  external}`; pure `accrued(elapsedMs)` beside `estimate` for metered runs;
  lifecycle `stop` learns to report (`COMPLETED` | `UNRESOLVED` |
  `STOPPED_UNSETTLED`); `utils.sleep`; `data.run.runId` for deterministic
  idempotency keys; `HttpResult.headers`.
- **Webhooks declared on docs** — account scope on the provider def
  (declarative HMAC verify + pure correlate/dispatch + optional effectful
  subscribe), resource scope on the resource def; the host ingress executes
  them (v1 binding model: `account/{slug}` / `resource/{id}/{slug}` paths).
- **The saperly connector** — 17 endpoints + the `saperly/phone-number`
  resource, ported 1:1 from monid-services (provision saga, per-second
  metered calls, local reads, ownership anchors, inbound webhook runs).

## Non-goals

- Migrating sfs / mint / agentmail / smolmachine (expressiveness is proven in
  design.md; their ports are their own changes).
- Host-side implementation (monid-services resolver/workflow/webhook wiring)
  — recorded as HOST obligations in the specs.
- SUSPEND-instead-of-release, wallet auto-recharge on refused hold grows,
  exposing the hold-session clock on any API (v1-deferred; carried).
- Catalog `visibility` for internal endpoints (hosted policy, per prior D10).

## Impact

- `shared/core` (new resource schema family, binding section, webhook
  sections, accrue, lifecycle ctx additions), `shared/compiler` (resource
  compilation, binding derivations, coherence), `engine` (ports, phases,
  loadResource), `shared/testing` (resource runner, reader seeds),
  `scripts` (run/catalog), `connectors/saperly/**`, `config.yml`,
  `DEVELOPMENT.md`, `README.md`.
- All additive: existing docs recompile byte-identical (acceptance-checked).
  ENGINE_VERSION minor bump; `doc_format_since` and `fn_abi_since` stay
  put (pure-hook docs gain no capability and must not floor at a newer
  engine); the new `schema.resources_since` fact alone carries the
  resource family (docs' floor + resource fn entries' `api`) — guarded
  by `deno task version:check`.
