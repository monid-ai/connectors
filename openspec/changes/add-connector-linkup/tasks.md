# Tasks: add-connector-linkup

## 1. Vendor surface

- [x] 1.1 Read the published OpenAPI spec: base url, bearer auth, the
      `/v1/search` and `/v1/fetch` request bodies, the error body
- [x] 1.2 Read the rate card
      (https://docs.linkup.so/pages/documentation/platform/pricing):
      `depth` × `outputType` on search, `mode` × `renderJs` + `schema` on
      fetch

## 2. Connector

- [x] 2.1 `provider.ts`: bearer auth, `/v1` baseUrl, 120 s timeouts (deep
      search iterates), US-dollar pool, `output.fromError`
- [x] 2.2 `search`: strict mirror, `depth`/`outputType` binding defaults,
      one line per price cell
- [x] 2.3 `fetch`: strict mirror, `mode`/`renderJs` binding defaults, one
      line per price cell + `structured_output`
- [x] 2.4 Add the 2 ids to `connectors/ids.lock.json`

## 3. Fixtures and tests

- [x] 3.1 Record real chains with `deno task record` and trim them
- [x] 3.2 Replay tests: every price cell, estimates, provider errors, strict
      input, interning
- [x] 3.3 Live tests gated on `LINKUP_API_KEY`
- [x] 3.4 `deno task check && deno task test` pass with no network
