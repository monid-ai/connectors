# Proposal: add-connector-philidor

## Why

Philidor is a live risk-intelligence API for DeFi vaults, lending markets,
tokenized real-world assets, protocol incidents, security events, and
news-derived risk signals. These are useful agent primitives for screening an
opportunity, researching a protocol or asset, and monitoring a portfolio's risk
context. The API is synchronous JSON over HTTP with one host, bearer auth, a
uniform error envelope, and no per-call vendor credit meter, so it needs no new
engine capability.

## What Changes

- **connectors/philidor** — nine read-only tools against
  `https://api.philidor.io/v1`, bearer auth, 20 s request / 30 s run timeouts,
  provider-level FREE usage, and a provider-level error digest for Philidor's
  `{error: {code, message}}` envelope.
  - Vault discovery and detail.
  - DeFi risk events, the broad security-event registry, and news-risk signals.
  - Tokenized RWA discovery and institutional asset detail.
  - Lending-market discovery and reserve-level detail.
- Input schemas mirror the public OpenAPI parameters and retain the vendor's
  wire names. There is no `input.toRequest` or `output.fromResponse`; validated
  query/path parameters go directly to the API and successful JSON responses
  are returned as received.
- Real recordings from every endpoint, trimmed by the repository recorder, plus
  a real 404 recording for the error contract.

## Capabilities

- `philidor-connector`.

## Non-goals

- No dashboard, admin, webhook, SSE, or other write/operational routes.
- No Risk Graph or other limited-release Decisioning routes in this first
  connector.
- No anonymous-auth mode. Core reads support limited keyless evaluation, but
  Monid uses an issued key for complete responses and stable per-key limits.
- No new taxonomy leaves; the existing `defi`, `yields`, `crypto-signals`,
  `onchain-data`, and `news-search` leaves describe the tools.
- No dollar conversion or invented credit unit. Philidor does not expose a
  per-call vendor meter for these reads; commercial packaging is account-level.

## Impact

New connector tree and OpenSpec change only. No schema, compiler, engine,
category, or version change.
