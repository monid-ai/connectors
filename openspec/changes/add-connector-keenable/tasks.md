# Tasks: add-connector-keenable

## 1. Provider + schemas

- [x] 1.1 provider.ts: X-API-Key auth, baseUrl, 30 s timeouts, one
      `default` pool, provider-level PER_CALL 1 (no consolidate)
- [x] 1.2 schema/common.ts: shared time-bound string + format describe

## 2. Endpoints (2)

- [x] 2.1 search: POST /v1/search, loose body, web-search, `mode`
      string (D3); PER_UNIT RESULT, empty result bills 0 (D2)
- [x] 2.2 fetch: GET /v1/fetch, strict queryParams, web-scraping,
      inherits PER_CALL; `live` boolean (D4)

## 3. Fixtures + tests

- [x] 3.1 Recorded 401 on both keyed paths (malformed key, 2026-09-16)
- [x] 3.2 Synthetic happy: search (shape from /search/public) and fetch
      (shape from /fetch/public), URLs rewritten to keyed paths
- [x] 3.3 Tests: provenance + pool + wire form, happy / 401 / schema
      gates (mode accepted, url required, live accepted, bound
      near-twins), empty search bills 0, live gated on KEENABLE_API_KEY
      (shape, not amounts)
- [ ] 3.4 Replace synthetic happy fixtures via `deno task record` when
      KEENABLE_API_KEY exists; confirm authenticated REST still carries
      no usage receipt

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / design / spec
- [x] 4.2 Verify: fmt · lint · check · test · double-compile ·
      version:check · catalog smoke
