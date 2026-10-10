# Tasks: add-connector-anymailfinder

## 1. Connector

- [x] 1.1 `provider.ts`: raw `Authorization` header auth,
      `https://api.anymailfinder.com/v5.1`, one credits pool, provider
      `consolidate` on `$.credits_charged`, provider-level `fromError`
      (`message`, `error`), 185 s request / 190 s run timeouts (real-time
      SMTP checks can take up to 180 s)
- [x] 1.2 `schema/common.ts`: shared `domain` / `company_name`
- [x] 1.3 Four endpoint defs + strict per-endpoint input schemas with the
      vendor's identification rules as unions
- [x] 1.4 Synthetic fixtures (shapes from live 2026-10-01 responses)
- [x] 1.5 Replay + schema-gate + gated-live tests per endpoint; provider
      rate table and fn-provenance tests
- [x] 1.6 `connectors/ids.lock.json` updated
- [ ] 1.7 Maintainer live run with a test credential (`deno task test:live`)
