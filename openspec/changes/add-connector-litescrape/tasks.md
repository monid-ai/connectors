# Tasks: add-connector-litescrape

## 1. Decisions (owner, 2026-09-20)

- [x] 1.1 Pool = Litescrape credits, one per call on every endpoint (D2)
- [x] 1.2 An empty success records 0 — v1's posture (D3)
- [x] 1.3 The vendor's follow-up links are relayed verbatim (D5)

## 2. Provider

- [x] 2.1 `schema/`: `common.ts` (query, country, language, device, flag,
      lat / lon, offset, http URL, the Google locale and origin trios, the
      Maps feature id), `google-search.ts` (the shared Search contract),
      `google-play.ts`, `apple.ts` (`zMuid` with the 64-bit pattern),
      `yelp.ts`, `tripadvisor.ts`
- [x] 2.2 `provider.ts`: meta + 4 notes, Bearer preset, base URL with the
      `/api` prefix (D1), 120 s timeouts, the akta array→CSV `toRequest`,
      `fromError` over the stable error body (D4), the credits pool (D2),
      the one-call `estimate` (D3)
- [x] 2.3 `connectors/categories.ts`: leaf `app-stores`

## 3. Endpoints (33)

- [x] 3.1 Google (13): search / ai-overview (3-arm union + `oq`, `gs_lp`,
      `sclient`), ai-mode, ads, local (`start` ≤ 10,000), shopping (2-arm
      union), shopping/product (gpcid ⊕ prds), maps (4-arm union),
      maps/popular-times, maps/posts, maps/photo-meta, reviews (place_id ⊕
      data_id), contributor-reviews
- [x] 3.2 Google Play (6): apps, games, books, movies, product, reviews
- [x] 3.3 Apple (5): app-store search / product / reviews, maps places
      (`muid[]`) / reviews
- [x] 3.4 Bing (2): search, maps (q | place_id)
- [x] 3.5 DuckDuckGo (2): search, maps (bbox ⊕ lat+lon)
- [x] 3.6 Yelp (2): search (`attrs[]`), reviews (`rating[]`; the three
      422 fields not mirrored)
- [x] 3.7 Tripadvisor (3): search, place, reviews
- [x] 3.8 Every endpoint: PER_UNIT·RESULT amount 1, its own 0|1 evidence
      over v1's `RESULT_GROUPS` (D3)

## 4. Verify

- [x] 4.1 `compiler:compile` twice — byte-identical; 33 docs; zero input
      fields without a description; the unions compile to `anyOf`; 22
      distinct evidence fns, one estimate / toRequest / fromError key
- [x] 4.2 `provider.test.ts`: literal rate table whose key set equals the
      ids; every happy run settles one credit and relays the body verbatim;
      the CSV join; ten empty cases at 0; a 401 per family; the overview's
      404 and a 400; strictness on all 33; union and pattern gates with
      passing near twins; provenance; meta; one gated live case
- [x] 4.3 Red drills: `amount` 1 → 2 (the rate table), a result-group typo
      (the happy run), the dropped `.omit()` on reviews (the gate) — each
      went red on the expected assertion, then green again
- [x] 4.4 `deno task lint` / `check` / `test` (1141 passed), `version:check`
      (no bump), no Chinese in the diff

## 5. Openspec

- [x] 5.1 proposal / design D1–D10 / spec / tasks

## 6. Follow-ups

- [ ] 6.1 With a key: `deno task record` the happy, empty, and unauthorized
      scenarios and replace the `synthetic-*` fixtures (D10); run the
      gated live test; confirm the drill's "every 200 deducts one credit"
      against `GET /api/keys/status`
- [ ] 6.2 Inspect a real 402 (credits exhausted) body; if it carries a
      top-up link, decide whether to digest it out in `fromError`
- [ ] 6.3 If the vendor restores `/google/maps/web` (v1's
      `GOOGLE_MAPS_WEB_ENDPOINT`), add it back with v1's schema
- [ ] 6.4 When the engine gains a byte / artifact channel, revisit the
      256 KB overflow gate v1 had (a Play games browse page measured 568
      KB); the body is inline until then
- [ ] 6.5 Keep the Google Search / AI Overview mirror in step with the
      per-endpoint docs pages, which list fields (`oq`, `gs_lp`, `sclient`)
      the extended reference does not (D9)
