# Tasks: add-connector-search1api

## 1. Connector

- [x] 1.1 `provider.ts`: bearer auth, `https://api.search1api.com`, credits
      pool, provider-level `fromError` (`detail` → `title` → `message`)
- [x] 1.2 `schema/common.ts`: shared `/search`+`/news` mirror incl. `""`
      enum entries
- [x] 1.3 Five endpoint defs + per-endpoint strict input schemas; 1
      credit each, empty result lists unbilled (`crawl` flat); 60 s
      provider timeout (deep search can exceed 30 s)
- [x] 1.4 Real fixtures recorded with a vendor key
      (`deno task record`, trimmed) + one recorded 401; provider-level
      shared chains with `{{request.url}}`
- [x] 1.5 Replay + schema-gate + gated-live tests per endpoint
- [x] 1.6 `deno task check && deno task test` pass with no network
