# Tasks: add-connector-alienprobe

## 1. Connector

- [x] 1.1 `provider.ts`: empty credential shape + identity `inject`
      (x402-native, no key), base URL `https://lookups.alienprobe.ai/v1/lookup`,
      `default` USD pool, provider-level `fromError`
      (`hint` → `reason` → `error`; 402 named as x402)
- [x] 1.2 Three endpoint defs (`company`, `who`, `lei`) with strict query
      mirrors of the live OpenAPI; flat PER_CALL $0.04 / $0.05 / $0.005
- [x] 1.3 Provider-level fixture chains: live free refusals (400/404/409)
      and 402 challenges; 200 bodies from the seller's declared 402
      example (`company-ok` paid on-chain; `who`/`lei` `synthetic-`)
- [x] 1.4 Replay + schema-gate tests per endpoint; live tests opt-in via
      `ALIENPROBE_LIVE=1` (no credential to gate on) and free 404s only
- [x] 1.5 Three ids added to `connectors/ids.lock.json`
- [x] 1.6 `deno task check && deno task test` pass with no network
- [ ] 1.7 Reviewers: decide how hosted Monid pays an x402 upstream for a
      catalog connector (see proposal, Open question)
