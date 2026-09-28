# Tasks: add-connector-adlegends

## 1. Drill the vendor surface

- [x] 1.1 Confirm there is no public OpenAPI — hosted MCP at
      `https://www.adlegends.ai/api/mcp/brands` is the agent surface
- [x] 1.2 Probe unauthenticated: GET 405, POST without Bearer → 401
      `{jsonrpc,error:{code:-32001,message:"Missing or malformed Bearer token"}}`
- [x] 1.3 Capture live MCP `tools/list` schemas for the eleven tools
      via the Ad Legends brands MCP (2026-09-22)
- [x] 1.4 Confirm Legend Credits exist (image 9 / Google Search 3) but
      no stable wire meter — FREE model, notes only

## 2. Provider

- [x] 2.1 `provider.ts`: bearer auth, baseUrl, Accept header, FREE
      model, lifecycle.start (JSON-RPC error synthesis), fromResponse
      unwrap, fromError digest; no credit pool
- [x] 2.2 `schema/common.ts`: `zPackType`, `zBrandId`, `zRequestId`,
      `zPlanningContext`

## 3. Endpoints (11)

- [x] 3.1 Account: `get_started`, `whoami`, `get_credit_status`
- [x] 3.2 Brands: `list_brands`, `get_brand`, `get_brand_memory`,
      `create_brand_from_url` (120 s / 130 s), `create_manual_brand`
- [x] 3.3 Fast Ads: `create_ads`, `get_ad_session`, `list_ad_sessions`
- [x] 3.4 Every def: `endpoint: "/<tool>"`, `POST /api/mcp/brands`,
      `toRequest` wraps `tools/call`

## 4. Fixtures + tests

- [x] 4.1 Provider-level synthetic chains: tool-ok, jsonrpc-error,
      tool-error, unauthorized
- [x] 4.2 `provider.test.ts`: interned start/fromResponse/fromError,
      happy + JSON-RPC 400 + 401 for all eleven, tool isError, gated live
- [x] 4.3 Per-endpoint schema gates + happy replay; live skip without
      `ADLEGENDS_CREDENTIALS_API_KEY` / `ADLEGENDS_API_KEY`

## 5. Wiring + docs

- [x] 5.1 OpenSpec `add-connector-adlegends` (proposal / spec / tasks;
      no design.md — no contract move)
- [x] 5.2 `deno task ids:check --update`
- [x] 5.3 `deno task check && deno task test`
