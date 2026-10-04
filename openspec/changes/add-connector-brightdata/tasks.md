# Tasks: add-connector-brightdata

## 1. Drill the vendor surface

- [x] 1.1 Pin the published `PostBody` for both products from the OpenAPI
      (`/api-reference/rest-api/unlocker/unlock-website`,
      `/api-reference/rest-api/serp/serp-api`): shared `url`, `format`,
      `method`, `country`, `data_format`; `render` and `debug` on Web
      Unlocker alone; `zone` required on both
- [x] 1.2 Confirm live that both products are the SAME wire path
      (`POST /request`) and that the zone type is the whole difference
- [x] 1.3 Search for a meter, and establish there is none: no credits or
      cost field in either payload, no usage header; `x-brd-debug` is
      opt-in, a debug aid, and a header
- [x] 1.4 Drill the billing partition (D4): target 404 answers a 200
      envelope in BOTH `raw` and `json` formats; zone-not-found is 400 and
      a rejected key is 401, both plain text
- [x] 1.6 Second pass on D4 after a live re-run: an unlock that fails
      UPSTREAM also answers 200, with an empty body and `x-brd-status-code:
      502`
- [x] 1.7 Third pass on D4 (review): verdict headers per the vendor's
      error-code reference, drilled live — `no_peers` / `proxy_error` /
      `req_timeout` (empty body, 502), SERP `wrong_api` (NON-empty body,
      400), and under `format: "json"` the verdict inside the body
- [x] 1.5 Read the published rate off the pricing pages: $1.50 / 1,000
      requests pay-as-you-go for both, $1.30 above the $499 Scale
      allowance, 5,000/month free tier shared across products

## 2. Provider

- [x] 2.1 `schema/auth.ts`: `{apiKey, serpZone, unlockerZone}` +
      `BRIGHTDATA_KEYS` derived from the shape
- [x] 2.2 `schema/request-body.ts`: the shared mirror, `zone` deliberately
      absent, optionality only
- [x] 2.3 `provider.ts`: baseUrl, timeouts, dollar credit pool, credentials;
      no inject, no consolidate, no fromError; a `lifecycle.start` that
      settles an in-band failure as a provider error (D4)

## 3. Endpoints (2)

- [x] 3.1 `serp` — declared id `/serp`, inline inject over `serpZone`,
      SERP-specific `url` description, `PER_CALL` 0.0015
- [x] 3.2 `unlocker` — declared id `/unlocker`, inline inject over
      `unlockerZone`, mirror + `render` + `debug`, `PER_CALL` 0.0015;
      `data_format: "screenshot"` held back (binary body)

## 4. Fixtures (8, real recordings, hand-minimized)

- [x] 4.1 `serp-ok` — parsed results page, arrays capped, base64 `icon`
      leaves dropped
- [x] 4.2 `unlocker-markdown-ok` — a bare STRING payload
- [x] 4.3 `unlocker-target-404` — the 200 envelope carrying `status_code: 404`
- [x] 4.4 `invalid-token` — plain-text 401
- [x] 4.5 `zone-not-found` — plain-text 400
- [x] 4.6 `unlock-failed-raw` — 200, empty body, `x-brd-error-code: no_peers`
- [x] 4.7 `unlock-failed-json` — 200, verdict inside the body
- [x] 4.8 `serp-wrong-api` — 200, NON-empty body, `wrong_api` / 400
- [x] 4.9 `RECORDED_RES_HEADERS` += `x-brd-status-code`, `x-brd-error-code`,
      `x-brd-err-code` (not `x-brd-error`: account-identifying)

## 5. Tests

- [x] 5.1 serp: happy fold, zone absent from the schema, rate pin,
      `wrong_api` failure, plain-text 401, schema gate, live
- [x] 5.2 unlocker: markdown-as-string, target-404 billable, wrong zone,
      failed unlock under raw and json, twin-id assertion, schema gate
      (incl. `screenshot` rejected), live
- [x] 5.4 `provider.test.ts` provenance: the rate table, an own inject per
      endpoint, one provider-authored lifecycle start shared by both, no
      consolidate / fromError / fromResponse / poll / stop
- [x] 5.3 `deno task check`, `deno task lint`, `deno fmt --check`,
      `deno task test`, live suite against a real key

## 6. Follow-up (not this change)

- [ ] 6.1 Web Scraper API as part 2: async trigger / progress / snapshot,
      priced per RECORD, over a curated set of the 1,763 published datasets
- [ ] 6.2 `POST /request?async=true` for both endpoints here, once the async
      protocol is being used by 6.1 anyway
