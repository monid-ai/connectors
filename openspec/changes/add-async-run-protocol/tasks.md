# Tasks: add-async-run-protocol

## 1. Foundation

- [x] 1.1 Branch `add-async-run-protocol` off updated main (stale merged
      branch deleted)
- [x] 1.2 config.yml + config.ts: `schema.async_since` (0.2.0),
      `schema.state_max_bytes` (64 KiB),
      `compiler.defaults.poll_interval_ms` (2000)

## 2. @shared/core schema

- [x] 2.1 hooks/lifecycle.ts — the effectful hook family: zHttpCall
      (url XOR path, per-call overrides), LifecycleUtils (json/money/http/
      log), request-info + start/tick data shapes, the running|completed
      outcome union, fn types + carriers
- [x] 2.2 sections/lifecycle.ts (all leaves .optional() per D20);
      def + provider def carry it; sections/timeouts.ts + pollMs
- [x] 2.3 run/result.ts — zRunRunning activated (ONE shape, providerRunId
      on both phases); RunStartResult/RunPollResult aliases
- [x] 2.4 zEnvelopeData + optional state; doc.ts lifecycle field +
      fnKeysOf closure; ctx.ts hook-count comment fixed

## 3. @shared/compiler

- [x] 3.1 Leaf-wise lifecycle resolve + intern (api = async_since);
      poll/stop-without-start compile error
- [x] 3.2 pollMs fallback emitted iff poll resolves; endpoint-level dead
      pollMs compile error; minEngineVersion floors via existing semverMax
- [x] 3.3 lint.ts whitelist: encodeURIComponent/decodeURIComponent/Promise

## 4. Engine

- [x] 4.1 fn-utils.ts: makeLifecycleUtils (http bound to transport +
      request origin + auth + requestMs; log → EngineCtx.logger);
      transport.ts: sniffDecode shared
- [x] 4.2 link.ts: async lifecycle wrappers (data/outcome validation →
      FN_CONTRACT; EngineError passthrough; other throws →
      EXECUTION_FAILED); LinkedFns +3
- [x] 4.3 engine.ts: lifecycle branch in start, real poll, best-effort
      stop, ONE settle helper (state in envelope; zero-usage forcing on
      non-2xx), state cap, run() loop (injectable sleep + now, per-tick
      pollAfterMs, timeout → stop + TIMEOUT); request.ts substituteUrl
      extraction; interfaces + mod exports; engine 0.1.0 → 0.2.0
- [x] 4.4 Engine test suite: 13 lifecycle tests (happy loop, wire
      sequence, error-as-data at both phases, synthesized 500, per-tick
      cadence, running-without-poll, state cap, EXECUTION_FAILED vs
      FN_CONTRACT, stop swallow, deterministic timeout, per-call http
      overrides + auth injection, compile checks, sync 0.1.0 pin)

## 5. Testing plumbing

- [x] 5.1 runner.ts: instant sleep injected in replay mode
- [x] 5.2 Fixture diet (D11): trimJson/trimCalls pass (arrays→2, strings→
      500 chars, responses only) applied by `record` by default
      (`--no-trim` opts out); fixture-size lint (warn 32 KiB / fail
      128 KiB); fat apify recordings re-trimmed (instagram 176→41 KB,
      gmaps 86→23 KB, tweets 55→35 KB) with assertions updated to the
      trimmed reality

## 6. Apify connector (tranche 1)

- [x] 6.1 scripts/apify-scaffold.ts + `deno task apify:scaffold` — live
      schema fetch → static zod generation; run for all 5 actors with the
      test key; curated (stringList items → z.array(z.string()))
- [x] 6.2 provider.ts — lifecycle + consolidate ported 1:1 from v1
      actor-run.ts; categories.ts leaves (people-enrichment, linkedin,
      instagram, twitter, youtube, maps)
- [x] 6.3 Five pure-data endpoints: linkedin-profile-scraper,
      instagram-profile-scraper, google-maps-scraper, tweet-scraper,
      youtube-video-transcript
- [x] 6.4 REAL recorded fixtures via `deno task record` (full live
      start→poll×N→dataset chains for all five; linkedin also records the
      invalid-URL error-item reality); synthetic fixtures for the paths a
      valid key cannot produce (actor-failed, 401, abort)
- [x] 6.5 Tests: doc-shape + shared-interning, happy replays for all five,
      error-item billing, synthesized-500 zero usage, 401 zero usage, stop
      swallow, live smoke (youtube, gated), live schema-drift guard
- [x] 6.6 Tranche 2 — the FULL port: all 46 v1 apify endpoints in-repo.
      41 new endpoint defs generated from the v1 catalog dump (meta ported;
      pricing/estimation/visibility stay hosted); 41 schemas scaffolded
      fresh from each actor's published schema + curated; 7 new category
      leaves (amazon, facebook, google-shopping, jobs, reddit, snapchat,
      tiktok); 44 REAL recorded happy chains (batch-recorded live with
      minimal inputs, trimmed by D11; reddit-scraper-lite's 31-call chain
      compacted; the 3 schema-rejected inputs re-recorded after the
      compiled schemas caught them pre-spend) + 2 synthetic-happy
      (snapchat-spotlight, tiktok-comments — no recordable input at hand);
      one generated happy-replay test per endpoint
- [x] 6.7 linkedin-profile-search — the leaf-wise-override showcase:
      endpoint-level poll (page/profile reconstruction stamped onto output
      + state) + consolidate (units = SEARCH PAGES + profiles; a
      zero-profile run stays billable) over inherited start/stop/fromError;
      Unit.PAGE added (append-only, covered by the 0.2.0 minor);
      profileScraperMode REQUIRED in the schema (the v1 admission rule,
      declaratively); event rates refreshed from the actor's live
      pricingPerEvent (v1's constants had drifted — the exact re-verify
      trigger its decision record named)

## 7. ABI polish round (design D12–D14, review round 2)

- [x] 7.a ctx = {data, utils, logger} for EVERY hook (HookLogger in core;
      utils.log deleted; auth's logger silent by construction);
      fn_abi_since → 0.2.0 (every doc floors there — honestly, no 0.1.0
      engine ever shipped)
- [x] 7.b utils.request() — the default relay beside untouched utils.http;
      both bound per invocation; apify start = `await utils.request()`
- [x] 7.c output.fromError (5th pure hook: contract + section + doc slot +
      fnKeysOf + compiler + linkFns + engine error path) +
      providerHttpStatus? (ours/theirs, optional) — apify's provider-level
      fromError ports v1's apifyErrorBody with `raw` preserved
- [x] 7.d state.externalRunId reserved key replaces the providerRunId field
      (engine-enforced non-empty string; apify + demo + tests migrated)
- [x] 7.e Design records D12 (error categorization), D13 (steps-array
      rejection, full adaptor table), D14 (ABI polish); spec deltas +
      AGENT.md refreshed

## 8. Versioning + docs

- [x] 7.1 version-check CONTRACT_PATHS: hooks/lifecycle.ts,
      sections/lifecycle.ts, sections/timeouts.ts
- [x] 7.2 AGENT.md: hooks now seven; amended IO invariant; async no longer
      reserved; apify:scaffold command

## 9. Verification

- [x] 8.1 `deno task check` + `deno task test` green (109 tests);
      double-compile byte-identical (existing determinism test)
- [x] 8.2 Sync connectors untouched: exa/akta/octen/tinyfish docs still
      minEngineVersion 0.1.0, same fixtures pass
- [x] 8.3 Live: schema drift guard green; five real actor runs recorded
      end-to-end through the engine (the record path IS the live proof)
- [x] 8.4 `deno task version:check` (post-commit) — engine minor bump
      covers the new contract paths

## 10. Structured state + estimate round (D15–D17, PR #2 findings)

- [x] 10.a `run/state.ts`: RunKind (UPPERCASE, defined once) + zRunState
      (fn-owned externalRunId/stage/data + ENGINE-owned timing) +
      zStatePatch (presence-based merge; `{}` keeps everything);
      zRunRunning derived via `.extend`; RunCompleted gains required
      `timing: zRunTiming` (sync runs too — attempts 0)
- [x] 10.b Engine: advanceTiming (engine-stamped, fns cannot tamper),
      parseThreadedState (INVALID_INPUT on host corruption), assertState
      (zRunState + stateSchema + size cap → FN_CONTRACT), settle stamps
      the provider slices (t_provider_* parity), deadlineAt = runMs budget
- [x] 10.c Typed state: `lifecycle.state` (zSchemaCarrier) →
      `doc.lifecycle.stateSchema` (leaf-wise, hash-covered); engine
      validates state.data on EVERY boundary; apify declares it once at
      provider level
- [x] 10.d Error classes: JsonPathError (PATH_SYNTAX/PATH_NOT_FOUND/
      TYPE_MISMATCH) + CompileError (SCHEMA_INVALID/HOOK_UNRESOLVED/
      STATE_SCHEMA_INVALID/DOC_MALFORMED), both retriable=false; lifecycle
      catch classifies retriable===false throws as FN_CONTRACT
- [x] 10.e utils split (supersedes the D14 target rule): request gains the
      presence-based target override (url|path); http goes zero-defaults
      (doc-header merge removed); https-only absolute targets; SAME-ORIGIN
      credential rule (PreparedRequest.auth optional — cross-origin egress
      is BARE) — findings 8+9
- [x] 10.f usage.model (rate-free shapes; METERED dropped per v1
      deprecation; startWith keeps the base-fee component; matrix/tiered
      distinct) + usage.estimate (6th pure hook, engine estimate()
      entrypoint, default one CALL) + presets.estimate.* (v1
      EstimationLabel port, allow-lists as args)
- [x] 10.g Apify backfill: provider state schema + $.data.* signal paths;
      all 46 endpoints declare model/estimate; facebook-profile-posts-
      scraper keeps its custom estimate; linkedin-profile-search reads
      LIVE run-record rates (finding 5 — constants fallback only) +
      per_unit PAGE model + page-based estimate
- [x] 10.h Fixture strategy v2: provider-level shared shape chains
      (run-succeeded / run-failed / start-rejected / pay-per-event) with
      {{request.url}}/{{request.origin}} bindings + required description;
      per-endpoint apify fixtures/tests DELETED (the PII purge — findings
      1+4); scrubJson always-on in the recorder; test-inputs.json (one
      valid input per endpoint); lifecycle.test.ts iterates all 46
- [x] 10.i Drift guard: live.required ⊆ compiled.required (optional→
      required flips — finding 7); verified live against all 46 actors
- [x] 10.j Versions: ENGINE_VERSION 0.3.0; fn_abi_since/async_since 0.3.0
      (breaking hook ABI); version-check CONTRACT_PATHS extended
      (state/estimate/model/usage-section)
- [x] 10.k Docs: design D15 (structured state/timing/typed data/kinds),
      D16 (egress hygiene), D17 (model/estimate/error codes); spec deltas
      rewritten to the implemented surface; Concepts delta refreshed
- [x] 10.l Verify: check + 117 tests green + lint + fmt + compile
      (minEngineVersion 0.3.0, 26 fnTable entries) + version:check + live
      drift guard

## 11. Estimate revision: pinned input fields, no probing

- [x] 11.a estimation.ts DELETED (allow-lists + apifyEstimate): the v1
      field-probing was a workaround for UNPINNED actor inputs — v2
      endpoints carry typed schemas, so estimates name their exact knobs
- [x] 11.b All 42 per_result endpoints declare `model: {kind:
      "per_result"}` explicitly + `presets.estimate.*` applied with their
      OWN schema fields (probe order = arg order, only where a schema
      genuinely has several knobs); provider-level model default removed
- [x] 11.c Endpoints v1 mis-probed now estimate truthfully:
      tiktok-video-scraper onePerQuery(postURLs), youtube-video-transcript
      limitIsExact(max_videos, 1), amazon-reviews-extractor
      perQueryPages(limit pages × products), facebook-events-scraper
      maxEvents, linkedin-post-search maxPosts (v1 probed maxComments),
      google-shopping-scraper limit; amazon-search-scraper gets a custom
      inline estimate (per-item maxPages inside the input array)
- [x] 11.d presets.estimate docstring reframed (fields = pinned schema
      fields); design D17 + apify spec delta updated; 117 tests green

## 12. Rate-free model algebra + estimate surface (D18)

- [x] 12.a LIVE price re-check, all 46 actors (`GET /v2/acts/{id}`): every
      actor is PAY_PER_EVENT; event prices are TIERED BY OUR SUBSCRIPTION
      PLAN (eventTieredPricingUsd FREE→DIAMOND) — the no-rate-on-doc
      decision is a verified fact; 17 actors publish actor-start events
- [x] 12.b Unit enum: CALL REMOVED (a flat charge is never a count);
      values UPPERCASE (enum rule: uppercase keys AND values; lowercase =
      display); zUsage.units may be EMPTY — zeroUsage/defaultUsage/
      presets.usage.perCall/engine estimate default all `{units: []}`;
      estimate.perCall preset deleted
- [x] 12.c usage/model/ split one-kind-per-file (v1 price-module pattern):
      per-call, per-unit, scalar (leaf union), composite (AND: ≥2 scalar
      components, ≤1 PER_CALL, distinct units, superRefined), variant
      (SELECT, née unit_matrix; request-side selectors only), mod.ts union
      + DERIVED zUsageModelKind (extractZodDiscriminatorKeys ported to
      schema/zod-util.ts) + literal-typed const with load-time staleness
      guard; TIERED deleted (schedules are card rows)
- [x] 12.d All connectors declare survey-verified models via consts:
      apify 27 PER_UNIT·RESULT + 17 COMPOSITE([PER_CALL, PER_UNIT·RESULT])
      + 2 PER_CALL + PER_UNIT·PAGE (linkedin-profile-search);
      instagram-hashtag/post SURVEY-CORRECTED from v1's per-call to
      metered (+ exact-field estimates); akta PER_UNIT·CREDIT; exa
      PER_UNIT·RESULT; octen COMPOSITEs/PER_UNITs (search's call measure
      deleted — model-declared); tinyfish PER_CALL
- [x] 12.e `scripts/estimate.ts` + `engine:estimate` task (pure standalone
      estimate: rejecting transport as the no-IO proof, prints model +
      units); `scripts/apify-pricing-survey.ts` + `apify:pricing` task
      (shape drift guard — caught instagram-api-scraper's missed
      actor-start on first run; all 46 green after)
- [x] 12.f Tests: engine count-true chain (estimate units deep-equal
      settled units), estimate purity + `[]` default; apify card
      invariant (estimate AND settle cover every billed unit; PER_CALL
      estimates []) + estimate-accuracy log
- [x] 12.g Docs: design D18 + Concepts delta (Model row, Estimate row);
      spec deltas refreshed; version-check paths (model/ files,
      zod-util); 122 tests green, live pricing survey green

## 13. Component ids: keyed composite + keyed counts (D19)

- [x] 13.a Schema: `zCompositeModel.components` array → id-keyed map
      (`Record<zComponentId, zScalarUsageModel>`, ≥2 refine; old ≤1-PER_CALL
      / distinct-units constraints deleted — the key disambiguates);
      scalars gain optional `description`; VARIANT kind DELETED
      (selector.ts/variant.ts removed, kind enum shrunk)
- [x] 13.b `zUsage.units: Measure[]` → `zUsage.counts:
      Record<string, number>` (zMeasure deleted; zeroUsage/defaultUsage/
      presets.usage.perCall → `{counts: {}}`); composite → component-id
      keys, leaf PER_UNIT → the unit, PER_CALL/error → `{}`
- [x] 13.c Generic keying: `data.model` rides into the consolidate
      envelope + estimate ctx; apify provider consolidate and every
      `presets.estimate.*` derive their key from it (leaf → unit,
      composite → sole metered component id)
- [x] 13.d Enforcement: compiler rejects ≥2-metered composites without
      doc-level consolidate + estimate (HOOK_UNRESOLVED); engine
      `validateUsage` on settle + estimate returns (FN_CONTRACT)
- [x] 13.e Backfill: 17 apify composites keyed by live-surveyed
      charge-event names (codemod); octen search/broad-search keyed by
      response fields (broad-search gains the required doc estimate);
      re-models — tiktok-comments (2 flat components), exa#search
      (base-plus-overage: `call` + `additional_result`, offset counting
      max(0, n−10)), linkedin-profile-search (3 published events,
      mode-keyed fns)
- [x] 13.f Drift guard v2: declared component ids ⊆ published
      actorChargeEvents keys (rename/removal fails naming the id;
      unmodeled add-ons stay shape-level)
- [x] 13.g Tests: compiler ≥2-metered rejection; engine validateUsage
      (unknown key / flat key / wrong leaf key / `{}` passes) + generic
      keying via data.model; lifecycle card invariant re-keyed (subset
      rule for mode-selected composites) + linkedin mode spot checks;
      exa interning test updated (settle fns legitimately diverged)
- [x] 13.h Docs: design D19 + Concepts delta (Model/Estimate/Counts);
      spec deltas (schema/engine/compiler/apify); AGENT.md; version-check
      paths (selector/variant removed)

## 14. Review round 2: version reset, whole-state, billing hardening, identity

- [x] 14.a Version reset to the 0.0.1 pre-release floor (engine,
      doc_format_since/fn_abi_since/async_since); version:check relaxed
      to must-differ-from-base
- [x] 14.b Review fixes (13 threads triaged; 11 fixed, #15 declined —
      manual review posture, #19 moot — VARIANT deleted): pricingPerEvent
      projected to {eventPriceUsd} (state-size cap); utils.request body
      override presence-based; run() naps capped by the remaining budget;
      recorder scrubs request bodies + placeholder-identity convention
      (Feiyou Guo / Steve Jobs); compiler-boundary parseSchema failures
      coded DOC_MALFORMED; scaffold tag-strip to a fixpoint (CodeQL)
- [x] 14.c D21 whole-state outcomes: zStatePatch/mergePatch deleted;
      Outcome.state present = the COMPLETE next fn-state, absent = carry
      forward; RUNNING.state optional
- [x] 14.d D19a billing hardening: usage.model REQUIRED (endpoint ??
      provider, compile error); presets diet (sharable-only, single-field
      args; perQueryPages/limitIsPages/dualLimit deleted, 9 docs inline);
      actor-default knobs as schema .default() materialized by
      validateInput (cloned body, ajv useDefaults); estimate-fidelity
      fixes #9/#10/#11
- [x] 14.e D22 endpoint identity: zEndpointDef.endpoint (native path,
      default request.path); id = provider# + path sans slash; 46 apify
      slugs pinned + tinyfish; test-inputs rekeyed; findEndpointDir
      resolves identity → source dir
- [x] 14.f Typed authoring (D19a type layer): defineEndpoint generic over
      model + body schema; MeteredKeyOf/TypedUsage/Typed ctxs; portable
      preset types; ts-expect-error proofs; countsMismatch shared switch
      (satisfies-never exhaustive) replacing the engine if-chain
- [x] 14.g Docs: D19a/D20/D21/D22 design notes; schema/compiler/engine/
      apify/testing spec deltas; AGENT.md; 132 tests green; live pricing
      survey green (46/46)

## 15. D23: typed estimates everywhere, provenance-named ctx paths

- [x] 15.a Estimate presets deleted (field args were unchecked strings;
      generic presets can't recover the check — eager factory calls);
      30 call sites converted to typed inline fns; dead transform.*/
      usage.perResult removed (≥2-sites rule); auth.* + usage.perCall
      kept (provider seams)
- [x] 15.b Fleet sweep: 16 pre-existing inline estimates off utils.json
      body probing onto direct typed access (dead `body ?? null` guards
      deleted; schema defaults read directly); premium-x-follower made
      mode-aware (fidelity fix)
- [x] 15.c Ctx renames: `data.model` → `data.usage.model`,
      `data.state` → `data.lifecycle.state` (schemas, engine assembly,
      provider + endpoint fns, tests, specs)
- [x] 15.d Typed lifecycle state: defineEndpoint generic over
      `lifecycle.state`; the fn-owned `state.data` bag typed at read
      (tick/envelope ctxs) AND write (outcome state) sites; raw vendor
      output stays Json (utils.json is its idiom); ts-expect-error
      proofs + typed-poll positive control
- [x] 15.e Docs: design D23; schema/engine/apify spec deltas; AGENT.md
      typed-authoring section; 133 tests green; estimate spot checks
      byte-identical; live pricing survey green

## 16. D24: complete counts vector, deduced estimates, labels, typed provider

- [x] 16.a Complete vector: flatCounts + reserved CALL key beside
      countsMismatch; engine appends the model's flat 1s at estimate +
      success settle (error settles stay zeroUsage); fns still never
      write flat keys (type + runtime); tests updated fleet-wide
- [x] 16.b Compile rule: metered model (≥1 PER_UNIT part) requires
      usage.estimate (≥2-metered keying rule kept, checked first)
- [x] 16.c Deduced estimates fleet-wide: three-source limit audit (our
      schema · live actor input schema · v1 monid-services impl;
      disposition table in design D24); fallback constants purged;
      knobs actor-default-pinned or REQUIRED at the binding site
      (schema files stay actor-faithful; zBody.required/unwrap derive,
      never restate); arithmetic fixes found by the audit (placeIds,
      topicUrls, shorts/streams, searches, related profiles, count vs
      limitPerSource, reddit multiplier); akta/exa/octen estimates
      authored from v1 credit math
- [x] 16.d Engine: schema defaults materialize for queryParams/pathParams
      too (cloned, useDefaults) — akta's limit default rides the wire
- [x] 16.e Labels: optional `label` on model scalars; "base fee" +
      plain-english plurals across apify/exa/octen/tinyfish docs;
      rendering services-side, key = fallback
- [x] 16.f Typed provider: shared TypedLifecycleSlots/TypedOutputSlots
      composed by defineEndpoint AND defineProvider<StateSchema>; apify
      provider own-state reads typed (corruption throws retriable:false),
      state writes compile-checked; ts-expect-error proofs
- [x] 16.g Docs: design D24 (+ disposition table); schema/engine/apify
      spec deltas; AGENT.md; 134 tests green; live survey 46/46; two
      test inputs gained required fields; two akta#news fixture URLs
      carry the now-explicit vendor default (no re-records)

## 17. D25: FREE billing shape, the required triple, input fidelity

- [x] 17.a zFreeModel (third leaf, kind-only) + zUsage.free; freeMismatch
      beside countsMismatch; engine: free suppresses flat completion,
      error settles stay zeroUsage without the flag; FREE/PER_UNIT arms
      across every exhaustive consumer
- [x] 17.b The billing TRIPLE compile-required (model + estimate +
      consolidate on every doc); flat docs state {counts:{}}, FREE docs
      the free pair; typed slots per model kind (free?: never on billed
      estimates — structural, conditional returns defeat EPC)
- [x] 17.c Input-fidelity repair fleet-wide: mirrors = optionality only
      (all .default()s moved to bindings, incl. D19a-era + exa/octen
      pre-existing); required/default/floor tightening DERIVED at
      bindings; primary limits REQUIRED, behavior knobs binding-default;
      array min(1)s + mode-refines removed (empty ⇒ estimate 0);
      facebook-profile-posts union reverted; identifier keys unquoted;
      youtube-scraper 0-semantics verified live (literal cap)
- [x] 17.d Typed queryParams (QuerySchema generic, TypedRunInput<B,Q>);
      estimate ctx reads the PRE-toRequest validated input (soundness:
      akta's toRequest CSV-joins arrays); akta estimates on direct typed
      reads
- [x] 17.e akta remodels: news COMPOSITE (request + article, doc-level
      consolidate off $.data); enrichment PER_UNIT sections (settle =
      delivered sections); employee/product-reviews keep CREDIT (native
      meter, no settleable block quantity); search/industry FREE;
      tinyfish FREE
- [x] 17.f Tests: FREE/dynamic-free/discipline engine tests; typed
      proofs (free omitted, free-on-billed, queryParams typo); akta/
      tinyfish expectations; 138 tests green
- [x] 17.g Docs: design D25 (standing input-fidelity rules); schema +
      engine spec deltas; AGENT.md; version stays 0.0.1
