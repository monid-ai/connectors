# Tasks: add-connector-apollo

## 1. Decisions (owner, 2026-09-16)

- [x] 1.1 No phone reveal in this change; `people/match` is synchronous (D2)
- [x] 1.2 Rate card = Apollo's current table; no personal-email surcharge (D3)
- [x] 1.3 Pool = Apollo credits, amounts in credits (D3)
- [x] 1.4 Empty page / no match draws nothing: PER_UNIT with a 0|1 count (D4)

## 2. Provider

- [x] 2.1 `schema/common.ts`: `zStringList`, `zDate`, `zBound`,
      `zEmployeeRanges`, `zSearchPage`, `zSearchPerPage`
- [x] 2.2 `provider.ts`: meta + 2 shared notes, `x-api-key` auth, baseUrl,
      timeouts (D9), Apollo-credits pool; no consolidate (D3), no fromError
      (D7), no toRequest (D6)

## 3. Endpoints (8)

- [x] 3.1 `mixed-people-api-search` — FREE, 24 filters
- [x] 3.2 `mixed-companies-search` — PER_UNIT·PAGE, 24 filters
- [x] 3.3 `organizations-job-postings` — PER_UNIT·PAGE, pinned id
      `/organizations/job_postings` (D1)
- [x] 3.4 `news-articles-search` — PER_UNIT·PAGE, `organization_ids[]`
      required by Apollo, `per_page` ≤ 25
- [x] 3.5 `people-match` — PER_UNIT·RESULT, 9-arm identifier union (D5),
      asynchronous channels omitted (D2), `match_confidence` / email count
      rule (D8)
- [x] 3.6 `organizations-enrich` — PER_UNIT·RESULT, 3-arm union (D5)
- [x] 3.7 `people-show` — PER_UNIT·RESULT, pinned id `/people/show` (D1),
      placeholder-email note
- [x] 3.8 `organizations-show` — PER_UNIT·RESULT, pinned id
      `/organizations/show` (D1)

## 4. Verify the shape

- [x] 4.1 `compiler:compile` twice — byte-identical; 8 docs; zero input
      fields without a description
- [x] 4.2 Compiled `people/match` input is a 9-arm `anyOf`, each arm
      `additionalProperties: false` without the five omitted channels;
      `organizations/enrich` is 3 arms

## 5. Fixtures (synthetic)

- [x] 5.1 Per endpoint: `synthetic-happy` (reference example, trimmed),
      `synthetic-provider-error` (the reference's 403 / 422 / 429 body);
      `synthetic-empty` on the three paged endpoints; `synthetic-no-match`
      on both enrichments (shape assumed — see the fixture descriptions)

## 6. Tests

- [x] 6.1 `provider.test.ts`: literal rate table whose key set equals the
      eight ids; every happy run folds to its row; provenance (one auth,
      no consolidate / toRequest, synthesized FREE fns, two interned
      estimates, six evidence texts)
- [x] 6.2 Eight `endpoint.test.ts`: happy (usage deep-equal, output =
      fixture body), empty / no-match, provider error, schema gates with
      passing near-twins, live gated on `APOLLO_API_KEY`
- [x] 6.3 Red once: see the PR body
- [x] 6.4 Verify: fmt · lint · check · test · double-compile · version:check

## 7. Follow-ups (not in this change)

- [ ] 7.1 With an Apollo key: `deno task record` the happy, empty / no-match
      and error chains and replace the `synthetic-*` files; confirm the
      no-match shapes (`match_confidence: "none"` echo, `organization: null`)
      and whether an empty search page is billed
- [ ] 7.2 Phone reveal: needs the engine to preserve integers outside the
      safe range (Apollo's signed 64-bit `request_id`) — then `people/match`
      gains a `poll_only` start/poll pair against `GET /webhook_result/{id}`
      and the +8-credit mobile line (v1 had both)
- [ ] 7.3 `reveal_personal_emails`: the current rate card lists no surcharge;
      re-check against a live credit ledger before relying on it (v1 charged
      +1 from an older card)
