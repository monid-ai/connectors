# Tasks: add-connector-sentisense

## 1. Vendor surface

- [x] 1.1 Read the published API reference (https://sentisense.ai/docs/api):
      base url, header auth, the 11 endpoints' params, the preview
      envelope, the error bodies
- [x] 1.2 Probe the live API for what the reference leaves open: which
      params 400 and which clamp, the 401 body, ETF refusals, latency

## 2. Provider

- [x] 2.1 `provider.ts`: header auth, baseUrl, timeouts, credit pool,
      PER_CALL lookup class, `output.fromError`
- [x] 2.2 `schema/common.ts`: `{ticker}` path params, `lookbackDays`

## 3. Endpoints (11)

- [x] 3.1 Per ticker: sentiment, rating, options summary, insider trades,
      congressional trades, institutional holders, stories by ticker
- [x] 3.2 Market-wide: market mood, insider cluster buys, story search,
      entity search
- [x] 3.3 Credit classes: analytics endpoints 2, alternative-data endpoints 4
- [x] 3.4 Three category leaves in `connectors/categories.ts`
- [x] 3.5 Add the 11 ids to `connectors/ids.lock.json`

## 4. Fixtures and tests

- [x] 4.1 Record all 11 endpoints plus a 404; move them to provider-level
      chains with descriptions; keep the recorded 401 body
- [x] 4.2 `provider.test.ts`: each endpoint settles at its class with the body passed
      through, a 401 per endpoint at zero, the 404 digest, shared fns,
      the input gates
- [x] 4.3 Live test gated on `SENTISENSE_API_KEY`
