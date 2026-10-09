# Tasks: add-connector-hunterio

## 1. Decisions (owner, 2026-09-17)

- [x] 1.1 Pool = Hunter credits; amounts = v1's drill-verified credit
      consumption (D3)
- [x] 1.2 `/discover-ai` ported at $0.10 converted to credits (8.36) (D6)
- [x] 1.3 `/email-verifier` owns start / poll for Hunter's 202 / 222 (D2)

## 2. Provider

- [x] 2.1 `schema/common.ts`: `zDomain`, `zCompanyName`, `zCommaList`,
      `zLocationFilter`, `zHeadcount`, `discoverFilterFields`,
      `discoverPaginationFields`
- [x] 2.2 `provider.ts`: meta + 2 notes, `X-API-KEY` header preset, the
      v2 host, timeouts 30 s / 60 s (D8), the credits pool, a generic
      evidence that counts nothing (D3), `fromError` for `{errors[]}` (D4)

## 3. Endpoints (13)

- [x] 3.1 `domain-search` — POST body (D5), `limit` required, domain |
      company union, PER_UNIT·RESULT `every: 10`, evidence `data.emails[]`
- [x] 3.2 `email-finder` — 5-arm union, PER_UNIT·RESULT 0|1 on `data.email`
- [x] 3.3 `email-verifier` — start / poll (D2), 180 s / 10 s, 0.5 per
      definitive verdict
- [x] 3.4 `email-count`, `domain-finder`, `discover`, `discover/people`,
      `multi-domain-search` — FREE; unions where v1 refined (D7)
- [x] 3.5 `discover-ai` — pinned id on `/discover`, PER_CALL 8.36 (D6)
- [x] 3.6 `multi-domain-search/reveal` — PER_UNIT·RESULT per fresh reveal,
      `meta.credits_charged` claim + strip (D3)
- [x] 3.7 `people/find` (union), `companies/find`, `combined/find` —
      PER_UNIT·RESULT 0.2 on a complete core set; a 404 miss is
      error-as-data

## 4. Verify

- [x] 4.1 `compiler:compile` twice — byte-identical; 13 docs; zero input
      fields without a description; the unions compile to `anyOf`
- [x] 4.2 `provider.test.ts`: literal rate table whose key set equals the
      ids; every happy run settles its row; provenance (one inject, one
      fromError, the reveal's own consolidate, the verifier's own
      lifecycle)
- [x] 4.3 Thirteen `endpoint.test.ts`: happy, provider error, gates with
      near twins, live gated on `HUNTERIO_API_KEY`; the metered docs' zero
      cases (empty page, miss, unknown verdict, no-meter reveal); the
      verifier's 202 → 200 and 222 chains; the enrichment 404 miss
- [x] 4.4 Red once: see the PR body
- [x] 4.5 fmt · lint · check · test · double-compile · version:check

## 7. Follow-ups (not in this change)

- [ ] 7.1 With a Hunter key: `deno task record` the happy and error
      chains and replace the `synthetic-*` files; re-confirm the reveal's
      `meta.credits_charged` placement and the 222 body shape
- [ ] 7.2 Scope the endpoints the live reference has added since v1:
      `domains-suggestion`, `domain-count`, `email-finder/found`,
      `email-insight` (free), Discover saved searches, `lookalikes`
- [ ] 7.3 v1's open drill: the verifier's invalid / accept_all charge was
      never measured (treated as billed, like valid) — confirm with one
      paid run
- [ ] 7.4 The 8.36-credit gate on `discover-ai` follows the Scale plan's
      $0.01196 per credit; rebase it if the plan changes
