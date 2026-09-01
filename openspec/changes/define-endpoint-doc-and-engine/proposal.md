# Proposal: define-endpoint-doc-and-engine

## Why

Monid v2 needs a connector standard where endpoints are authored once in TypeScript,
compiled into inert, self-contained JSON artifacts, and executed by a generic engine —
locally with an API key, in CI via fixtures, and later inside the hosted platform
(Temporal workflows + Relay) without changing a single doc. v1 (monid-services
adaptors) couples connector logic to the service runtime; monid-providers (abandoned)
proved the doc/def split but left compiled docs dependent on repo code via code refs.

## What Changes

- **@shared/core** — formal Def (author) and Doc (compiled) shapes: EndpointDef /
  ProviderDef with strictly-typed fn slots; EndpointDoc / ProviderDoc as strict
  RFC 8259 JSON; `$fn` content-hash references; `Usage`/`Measure`/`Unit`;
  restricted JSONPath (RFC 9535 subset); RFC 8785 canonical hashing
  (`stableStringify`); plus the authoring API — `defineProvider`/`defineEndpoint`
  (zod-first seed→def), the `preset()` marker, namespaced presets
  (`presets.transform.strip/pick/append`, `presets.auth.header/bearer`,
  `presets.usage.perCall/perResult`), def-tree loading (`load/`), and the closed
  category vocabulary (`connectors/categories.ts`).
- **@shared/logging** — structural `Logger` interface + pino adaptor
  (monid-services `interfaces/`+`adaptors/` pattern); compiler/CLI logging seams.
- **@shared/compiler** — the pure Def → Doc mapping: provider fusion (hooks
  chain, data falls back; usage.compute required), zod → JSON Schema, fn
  extraction (normalize → closed-term lint → sha256 → intern), auto-only
  `minEngineVersion` derivation, bundle assembly with closure check.
- **engine/** — published `@monid/connector-engine`: `Engine.load` (fail-closed
  gates), fn linking with slot-contract enforcement (`z.function().implement()`
  → FN_CONTRACT), request building, the JsonUtil host ABI, sniffing decode,
  host-gated usage redaction, Transport port (`directTransport`;
  `relayTransport` interface stub), usage-before-fromResponse, in-memory
  `run()` loop, and the bundle catalog read API (list/inspect). Temporal-shaped,
  zero Temporal dependency, zero IO at import.
- **@shared/testing** — endpoint test runner + HTTP fixture record/replay/live modes.
- **connectors/exa** — first connector: `search` + `contents`, fixtures, gated live tests.
- Top-level tasks: `compiler:compile`, `engine:run` (incl. `--list`/`--inspect`),
  `check`, `test`, `test:live`, `record`, `version:check`; CI workflow.

## Capabilities

- `connector-schema`: Def/Doc types, expression-free flat doc format, usage model.
- `connector-compiler`: Def → Doc + fnTable compilation and lints.
- `connector-engine`: loading, linking, execution pipeline, transports, versioning gates.
- `connector-testing`: fixture record/replay and the per-endpoint test pipeline.
- `exa-connector`: the exa provider with search and contents endpoints.

## Non-goals

Hosted services (Catalog/Broker/Relay implementations), uniform pricing, additional
providers (tinyfish/census/akta follow in later changes), resource lifecycle
implementation, async job endpoints, pagination, webhooks, binary responses, oauth/hmac.

## Impact

New code only; no existing systems modified. The bundle format and `ENGINE_VERSION`
contract become the interface consumed later by the hosted Catalog and workflow fleet.
