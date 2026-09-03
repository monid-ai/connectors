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
- [ ] 6.6 Tranche 2: bulk-port the remaining ~55 v1 actor endpoints
      (scaffold + meta port + synthetic fixtures + live smoke) — follow-up
      wave on this machinery

## 7. Versioning + docs

- [x] 7.1 version-check CONTRACT_PATHS: hooks/lifecycle.ts,
      sections/lifecycle.ts, sections/timeouts.ts
- [x] 7.2 AGENT.md: hooks now seven; amended IO invariant; async no longer
      reserved; apify:scaffold command

## 8. Verification

- [x] 8.1 `deno task check` + `deno task test` green (109 tests);
      double-compile byte-identical (existing determinism test)
- [x] 8.2 Sync connectors untouched: exa/akta/octen/tinyfish docs still
      minEngineVersion 0.1.0, same fixtures pass
- [x] 8.3 Live: schema drift guard green; five real actor runs recorded
      end-to-end through the engine (the record path IS the live proof)
- [x] 8.4 `deno task version:check` (post-commit) — engine minor bump
      covers the new contract paths
