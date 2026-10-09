# Tasks: add-resource-lifecycle-saperly

> AMENDED by `refine-resource-model` (D38–D47): entries below are stated
> in the FINAL vocabulary where the refine reshaped a surface (billing →
> usage rate card, ops.check → lifecycle.verify, ResourceRow →
> OwnedResource, externals → views, accrue → the estimate re-run).

## 1. Core schema — new resource family

- [x] 1.1 `shared/core/schema/resource/usage.ts` — `zResourceUsage`
      (one period w/ anchor + fixed/estimated lines) + `reconcileUsage`
      entries (`everyMs`, cumulative `get` → `{consumes,
      vendorConsumes?}`) + window shape.
- [x] 1.2 `shared/core/schema/resource/ops.ts` — lifecycle fn carriers +
      outcome schemas (verify / release / refresh / view read) + shared
      op ctx (`{resource, [window|args]}`).
- [x] 1.3 `shared/core/schema/resource/def.ts` + `define.ts` + `typed.ts` —
      `zResourceDef`, `defineResource` (generic over the `data` schema so
      ops/seeds are instance-typed), ids (`zResourceId =
      <provider>/<slug>`, authored `slug`).
- [x] 1.4 `shared/core/schema/resource/doc.ts` — `zResourceDoc` +
      `resourceFnKeysOf`.
- [x] 1.5 `shared/core/schema/sections/resource-binding.ts` —
      `zResourceBinding` (interaction enum, key JSONPath, seed/ensure
      carriers) + seed/ensure contracts in
      `shared/core/schema/hooks/resource-binding.ts`.
- [x] 1.6 `shared/core/schema/sections/webhooks.ts` +
      `hooks/webhooks.ts` — account/resource hook shapes (declarative
      verify descriptor; correlate/dispatch contracts; subscribe carrier).
- [x] 1.7 Wire into `zEndpointDef`/`zEndpointDoc` (`resource` binding, fn
      refs, `fnKeysOf`), `zProviderDef`/doc (`webhooks`), bundle
      (`resources` map + closure), `mod.ts` exports.

## 2. Core schema — modifications

- [x] 2.1 `sections/usage.ts` — `updateEstimateEveryMs` +
      `zEstimateData.elapsedMs?` (the estimate IS the accrual).
- [x] 2.2 `hooks/lifecycle.ts` — ctx `run: {runId}`; `LifecycleUtils.sleep`
      + `.resources`; `HttpResult.headers`;
      stop outcome union (`void | Completed | UNRESOLVED`).
- [x] 2.3 `run/result.ts` — `RunCompleted.resources`, `zRunStopResult`.
      (`RunStartResult.ensured` became the dedicated `ensure()` method —
      hosts persist seeds BEFORE start as their own activity; run() calls
      it inline.)
- [x] 2.4 `json/util.ts` — deep-omit already shipped as `JsonUtil.omit`;
      added the missing `str`/`optionalStr` pair instead (saperly's
      forgiving string reads).
- [x] 2.5 `config.ts` — `schema.resources_since` fact.

## 3. Compiler

- [x] 3.1 Discover + compile `resources/<name>/resource.ts`; fuse
      auth/origin; intern fns; emit docs; extend bundle closure +
      determinism tests.
- [x] 3.2 Binding resolution + coherence (unknown resource, key/interaction
      rules, seed/ensure placement, input-superset checks vs `inputs`,
      dead-binding lint).
- [x] 3.3 Billing coherence (variable ⇒ rent + release; cadence floor;
      updateEstimateEveryMs ⇒ poll + metered).
- [x] 3.4 `config.yml` facts + `scripts/version-check.ts` awareness;
      ENGINE_VERSION 0.1.0 → 0.2.0.

## 4. Engine

- [x] 4.1 `interfaces/mod.ts` — `ResourceReader`, `OwnedResource`,
      `RunnableResource`, `IResourceStore`, result re-exports.
- [x] 4.2 Capability gating in `fn-utils.ts` (`resources` stub vs real;
      `sleep`) + `transport.ts` headers passthrough.
- [x] 4.3 `engine.ts` — derived ownership gate (uniform 404), host-driven
      `ensure()` (seeds to the `admit` port before start), post-settle
      derived outputs (`RunCompleted.resources`, PROVISION_CONSTRUCT),
      `accrued(runInput, elapsedMs)`, stop-outcome handling, run-identity
      plumbing (UUID; one handle per `run()` loop).
- [x] 4.4 `loadResource` — link + gate + op runners (verify/release/
      refresh/reconcileUsage/view) with outcome validation + error
      taxonomy (`RESOURCE_OP_FAILED`).
- [x] 4.5 `errors.ts` — the four new codes; engine unit tests for every
      phase (gate hit/miss, ensure, seeds, accrued, stop outcomes,
      headers, reader gating).

## 5. Testing harness

- [x] 5.1 Fixture schema: top-level `resources` seeds + `res.headers`;
      fake ResourceReader in replay; instant sleep already covers
      `utils.sleep`.
- [x] 5.2 `loadResource` test wiring + op/reconcile/view fixture runners
      (three window shapes).
- [x] 5.3 Webhook pure-fn test helpers.

## 6. Saperly connector

- [x] 6.1 `connectors/saperly/provider.ts` (auth, credits, deepOmit
      projections, `number-events` webhook) + `schema/` (bodies + readers).
- [x] 6.2 `resources/phone-number/resource.ts` + fixtures + tests
      (verify active/released/gone, release idempotency + connection
      delete, refresh override/carry-forward, live persona view).
- [x] 6.3 Numbers: `provision-numbers` (saga + seed; fixtures: happy,
      PriceChanged retry, degraded bind, malformed quote, purchase-fail
      orphan hygiene), `release-numbers/{id}`, `list-numbers`,
      `get-numbers/{id}`, `update-numbers/{id}` (repair branch),
      `sync-numbers`.
- [x] 6.4 Catalogs: `list-voices`, `list-languages`.
- [x] 6.5 Calls: `place-calls` (start/poll/stop + elapsed estimate; fixtures:
      born-terminal, running→settled, grace exhaustion, stop-settled,
      stop-UNRESOLVED), `inbound-calls` (adopt; shared poll/stop),
      `list-calls`, `get-calls/{id}`, `calls/{id}/transcript`,
      `calls/{id}/recording` (302 location).
- [x] 6.6 Messages: `send-messages`, `list-messages`, `inbound-messages`.
- [x] 6.7 Live tests gated `SAPERLY_API_KEY` (+ `SAPERLY_LIVE_SPEND=1` for
      money cases, with teardown release); fixtures `synthetic-` until
      recorded.

## 7. CLI + docs + verification

- [x] 7.1 `scripts/run.ts --resources <file>`; `scripts/catalog.ts`
      resources listing + inspect.
- [x] 7.2 `DEVELOPMENT.md` chapters (resources, billing, bindings,
      webhooks, mid-run estimates) + `README.md` connector table row.
- [x] 7.3 Full verification: `deno task check && deno task test`;
      byte-identical recompile of every pre-existing connector;
      `deno task version:check`; `openspec validate --all` if available.
