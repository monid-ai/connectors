# Tasks: add-connector-vaquill

## 1. Drill the vendor surface

- [x] 1.1 Capture the published OpenAPI
      (`https://api.vaquill.ai/external/openapi.json`, 3.1.0); pin the base
      url, bearer auth, and every request schema field for field
- [x] 1.2 Pin the rate card against
      `https://api.vaquill.ai/api/v1/api-credits/pricing` (free,
      unauthenticated, so a repricing is checkable without a key): search 4,
      body 6, section 2, sections 2, resolve 2, related 2, cited-by 2,
      definitions 4, cross-state 6, changes 1, divisions 1, count 1,
      coverage 0
- [x] 1.3 Verify the meter location live: a top-level `creditsConsumed` on
      every billable response, absent entirely on `/coverage`
- [x] 1.4 Settle the counting bases by measurement, not by reading the
      price list: `#sections` bills per section RETURNED (1 good + 1 junk id
      = 2), the vendor bills `#resolve` per citation SUBMITTED including
      misses (2 citations, 1 resolved = 4), `#search` + `includeBody` = 4 +
      6 per row with text (2 rows = 16)
- [x] 1.5 Find the refund rule: `cross-state`, `definitions`, `cited-by`,
      `count` and `divisions` each return 200 with `creditsConsumed: 0` when
      the answer is empty. `related` and `changes` bill regardless
- [x] 1.6 Find the answers the vendor charges for that the caller does not
      pay for (2026-09-18): an empty `search` page (4), a `body` outside the
      held editions (`available: false`, 6), an empty `changes` page (1), a
      `resolve` citation that does not resolve (2). Recorded as
      `search-empty-ok`, `body-unavailable-ok`, `changes-empty-ok` and
      `resolve-partial-ok`; `resolve-ok` and a non-empty `changes-ok`
      (26 U.S.C. 1) carry the rate-table rows

## 2. Provider

- [x] 2.1 `provider.ts`: bearer auth, `/api/v1` baseUrl, 60 s timeouts,
      credit pool `default`, vendor-meter `usage.consolidate`; no lifecycle,
      no `output.fromError` (Vaquill's `{detail}` needs no normalizing)
- [x] 2.2 `schema/common.ts`: the fragments two or more endpoints share:
      `zActIdPathParams`, `zCorpusType`, `zScopeState`,
      `zJurisdictionState`, `zActStatus`

## 3. Endpoints (13)

- [x] 3.1 `search`: mirror + composite (answered-page search line + per-body line) + own consolidate +
      estimate/evidence
- [x] 3.2 `sections`: mirror + composite (per section returned + per body)
- [x] 3.3 `resolve`: mirror + PER_UNIT per citation RESOLVED + own
      consolidate (the vendor's claim adopted only when nothing missed)
- [x] 3.4 `count`: mirror + answered-or-refunded
- [x] 3.5 `divisions`: mirror + answered-or-refunded
- [x] 3.6 `coverage`: no input schema, FREE
- [x] 3.7 `section`, `section-related`: flat PER_CALL (quantities fns
      synthesized); `section-body`, `section-changes`: answered-or-free
      (text served / change observed, 1 or 0) + own consolidate
- [x] 3.8 `section-cited-by`, `section-definitions`, `section-cross-state`:
      answered-or-refunded

## 4. Fixtures + tests

- [x] 4.1 Record every chain against the live API via `deno task record`
- [x] 4.2 Consolidate to 32 provider-level chains (strategy v2), each with
      a `description`; `{{request.url}}` where the compiled url is the
      issued one, literal urls where a path param is substituted
- [x] 4.3 Per-endpoint replay tests, 13 of 13: happy, provider error,
      schema gate with an accepted twin proven through the pure estimate,
      and a live test gated on `VAQUILL_API_KEY`
- [x] 4.4 Provider-level `provider.test.ts`: the literal rate table against
      every compiled endpoint, the refund suite, the absent-meter fallback,
      fn provenance, and the US-only url guard
- [x] 4.5 `deno task test:live` green against a real key (60 passed)

## 5. Wiring + verification

- [x] 5.1 `connectors/categories.ts`: add the `legal-research` leaf
- [x] 5.2 Verify: fmt · lint · check · test (755 passed, 0 failed) ·
      double-compile `--force --frozen-meta` byte-identical ·
      `version:check` clean · catalog smoke

## 6. Notes for review

- [x] 6.1 The five answered-or-refunded endpoints, plus the four absorbed
      ones (`search`, `body`, `changes`, `resolve`), are where this
      connector deviates from "flat price means PER_CALL". The reason is in
      `proposal.md` and at each call site; `provider.test.ts` pins the
      refunds (REFUNDED) and the absorbed charges (ABSORBED), and the
      provenance test names the four endpoints that carry their own
      `consolidate`
- [x] 6.2 Seven pre-existing files in the repo fail `deno fmt --check` on
      deno 2.7.14 (minimax, opoint, surf, a workflow). None are touched by
      this change and none were reformatted
