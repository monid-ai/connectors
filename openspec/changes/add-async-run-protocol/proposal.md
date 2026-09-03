# Proposal: add-async-run-protocol

## Why

Level 1 of the connector standard was sync-only: `poll` threw `NOT_ASYNC`,
`zRunRunning` was reserved (D10/D29), and every async v1 provider (Apify,
MiniMax, Surf, Suzanne, Mint, Saperly, …) was unportable. This change
activates the reserved async run protocol — start → poll → stop as
stateless, strict-JSON, Temporal-activity-shaped calls — and migrates
monid-services' canonical async provider: **Apify**, whose whole
actor-run lifecycle (start actor → poll run → fetch dataset items → abort)
becomes ONE provider-level declaration inherited by pure-data endpoints.
After this change, monid-services can drive compiled docs through
`startProvider`/`pollProvider`/`terminateProvider`-shaped activities.

## What Changes

- **The lifecycle hook family** (`lifecycle.start` / `poll` / `stop`) —
  effectful-by-capability fns shaped like monid-services' `runLifecycle`
  hooks: they receive `utils.http` (the v2 provider runtime — every call
  goes through the engine's ONE transport port; auth injected at egress) and
  `utils.log`, sequence their own HTTP calls, relay vendor errors AS DATA,
  and thread opaque `state` between ticks. `request` stays REQUIRED and
  rides into the fns as `ctx.data.request` (start executes it by
  convention). Leaf-wise fallback applies per phase — a provider declares
  the lifecycle once.
- **Engine**: real `poll(runInput, state)` / `stop(runInput, state)`;
  `start` runs `lifecycle.start` instead of the declarative pipeline when
  present; ONE settle pipeline for both modes (consolidate on the raw
  envelope + final state → fromResponse → output.schema); zero-usage
  forcing on every non-2xx envelope; state size cap; injectable `sleep` +
  `now`; per-tick `pollAfterMs` override; `run()` timeout triggers
  best-effort stop.
- **Schema**: `zRunRunning` activated ({state, pollAfterMs,
  providerRunId?}, one shape for both phases); envelope gains optional
  `state`; `timeouts.pollMs`; new config facts `schema.async_since`,
  `schema.state_max_bytes`, `compiler.defaults.poll_interval_ms`.
- **connectors/apify** — provider-level lifecycle + settle fn ported 1:1
  from v1 `actor-run.ts`; tranche-1 endpoints (linkedin-profile-scraper,
  instagram-profile-scraper, google-maps-scraper, tweet-scraper,
  youtube-video-transcript) with REAL recorded fixtures (full live
  start→poll→dataset chains) and static input schemas scaffolded from each
  actor's published schema (`deno task apify:scaffold`).
- **ENGINE_VERSION 0.1.0 → 0.2.0** (additive minor). Sync docs stay at
  minEngineVersion 0.1.0 — never over-pinned.

## Capabilities

Deltas to `connector-schema`, `connector-engine`, `connector-compiler`,
`connector-testing`; new `apify-connector`.

## Non-goals

Resources / metering (saperly-class) / webhooks (later changes),
declarative poll/stop phase arms (reserved — the declarative start arm IS
`request` without a lifecycle), webhook doorbells, header access in
utils.http / Retry-After, `stop` result reporting (`unresolved`), start
idempotency keys, result pagination (a poll-fn-local edit later), in-body
error detection for SYNC docs, `estimate`, and the monid-services
integration itself (its resolver branch consuming sealed units is its own
change in that repo). Apify tranche 2 (the remaining ~55 actor endpoints)
follows as data-only additions on this machinery.

## Impact

Contract surface: new hook family + doc field + run-result activation ⇒
engine MINOR bump (0.2.0), new version-check contract paths. The IO
invariant is AMENDED (design D2): "all IO happens in the engine" → "all IO
flows through the engine's transport port". Existing connectors: exa/akta/
octen/tinyfish defs, docs, and fixtures byte-untouched.
