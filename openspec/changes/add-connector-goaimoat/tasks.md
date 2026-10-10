# Tasks: add-connector-goaimoat

## 1. Provider + endpoint

- [x] 1.1 `provider.ts`: name `goaimoat`, X-API-Key header auth,
      baseUrl `https://mcp.goaimoat.com`, FREE usage, timeouts 30/60
- [x] 1.2 `endpoints/ai-visibility/endpoint.ts`: POST `/api/audit`
- [x] 1.3 `schema/inputs.ts`: `brand_name` required, `category`/`score`
      optional, `.strict()`

## 2. Fixtures + tests

- [x] 2.1 `fixtures/happy.json` (200, recorded response)
- [x] 2.2 `fixtures/provider-error.json` (500, `{ error }`)
- [x] 2.3 `endpoint.test.ts`: happy, provider-error (digested envelope,
      zero usage), schema gate (`brand_name` required, `score` 0–30)

## 3. Docs + verify

- [x] 3.1 openspec: proposal, design D1–D4, spec, tasks
- [ ] 3.2 Verify: `deno fmt` · `deno lint` · `deno check` · `deno task
      test` · double-compile
