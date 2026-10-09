# local-host-loop (spec)

## ADDED Requirements

### Requirement: Local resource store
The repo SHALL ship a Deno KV adaptor of `IResourceStore`
(`.output/local.db`; `--unstable-kv` wired into deno.json tasks).
`engine:run` SHALL serve the ownership window from the store, hand
ensure's seeds to it via the engine's `EngineCtx.admit` port BEFORE the
run starts, and apply settle effects (provisions/releases, with
refresh/reconcile marks logged) back through it; `--resources file.json`
remains a one-off override that bypasses the store.

#### Scenario: Provision persists locally
- **WHEN** `engine:run saperly#provision-numbers` succeeds locally
- **THEN** the seed row lands in the store and a following
  `engine:run saperly#list-numbers` serves it

### Requirement: Webhook simulate and listen
`scripts/webhook.ts simulate <provider> <slug>` SHALL sign a payload per
the COMPILED doc's verify descriptor (provider-agnostic), execute the
verify check + `route`, print the `{who, what}` outcome, and with
`--execute` perform the action against the local store/engine.
`webhook.ts listen` SHALL run a minimal ingress for real vendor
deliveries behind a `TunnelAdaptor` (`start(port) → {url}` / `stop()`)
with adaptors `cloudflared` (default), `tailscale`, `none`. Tunnels live
in scripts only — the engine's network seam remains Transport.

#### Scenario: Bad signature rejected
- **WHEN** `simulate --bad-signature` runs
- **THEN** the delivery is rejected by the verify step and route never
  runs
