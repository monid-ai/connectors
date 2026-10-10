# Tasks: add-connector-bowmark

## 1. Provider + category

- [x] 1.1 provider.ts: bearer auth, `api.bowmark.ai/v1/monid` base URL,
      30 s defaults, one `default` pool in US dollars, no consolidate
- [x] 1.2 categories.ts: new leaf `web-automation`

## 2. Endpoints (2)

- [x] 2.1 library: GET /library, `Accept: application/json`, strict
      query params, FREE (D3)
- [x] 2.2 run: POST /run, strict body, `script` required non-empty;
      PER_UNIT RESULT $0.04, 0 unless status ok|partial (D2); 130 s /
      135 s timeouts (D4)

## 3. Fixtures + tests

- [x] 3.1 Recorded 2026-10-10: library read, happy run, failed run
      (HTTP 200 status error), 401 on an invalid key
- [x] 3.2 Tests: provenance + pool + wire form, happy / failed / 401 /
      schema gates, live gated on BOWMARK_API_KEY

## 4. Wiring + docs

- [x] 4.1 OpenSpec proposal / design / spec
- [x] 4.2 Verify: fmt · lint · check · test · double-compile ·
      version:check · catalog smoke
