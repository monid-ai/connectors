# Proposal: add-connector-alienprobe

## Why

[Alien Probe](https://alienprobe.ai) sells per-call company facts to
agents: legal-entity resolution and a firmographic profile joined from the
GLEIF golden copy (Level 1), SEC EDGAR and Wikidata, served from
digest-pinned snapshots. Every answer carries its provenance — the
snapshot's `source {name, vintage, snapshot_sha256, coverage}` and, on
the company profile, `{value, source, as_of}` on EACH field. It never
guesses: an ambiguous name is refused with candidates, and every refusal
(400/404/409/503) is free. It widens `company-enrichment` with a
provider whose answers are auditable per field.

Submitted by the seller. The seller is x402-native: there is no account
and no API key.

## What Changes

- **connectors/alienprobe** — provider on
  `https://lookups.alienprobe.ai/v1/lookup` + 3 GET endpoints, each a leaf
  `PER_CALL` in a `default` pool of US dollars (settled as USDC):
  `company` $0.04, `who` $0.05, `lei` $0.005 — the seller's
  `x-payment-info` fixed prices and the 402 `accepts[0].amount`
  (40000 / 50000 / 5000 USDC base units). Query params are `.strict()`
  mirrors of the live OpenAPI (read 2026-09-29). No `consolidate` — no
  response carries a meter; the flat fold is the bill. Provider-level
  `output.fromError` reads `hint` → `reason` → `error` and names a 402 as
  an x402 payment challenge.
- **Auth: x402-native, no key.** `auth.credentials` is an EMPTY object
  shape (not the `{apiKey}` default) and `auth.inject` is the identity fn
  `({data}) => data.request`. The compiler requires `inject` to resolve;
  an empty shape states honestly that no secret exists, so no env var is
  required and none is invented.
- **Provider-level fixture chains** — recorded live, free: 404/409/400/402
  per door. 200 bodies: the seller's own
  `extensions.bazaar.info.output.example` from the live 402
  `PAYMENT-REQUIRED` header. `company-ok.json` is the example the seller
  states is byte-identical to a real paid answer (paid on Base 2026-09-29
  03:10:21Z, tx `0x7885ab19…97f8`); `who` and `lei` carry the
  `synthetic-` prefix because no paid recording exists. All bodies through
  `trimCalls` + `scrubCalls`.
- **openspec/changes/add-connector-alienprobe** — this proposal; no
  `design.md` (no schema/engine contract change).

## Open question for reviewers (x402 upstream payment)

This format injects credentials; it has no hook that PAYS a request. With
`directTransport`, a paid door answers 402 and the run completes as
zero-billed provider-error data. For Alien Probe to answer through Monid,
the hosted Relay must answer the 402 itself: decode `PAYMENT-REQUIRED`
(x402 v2, scheme `exact`, network `eip155:8453`, USDC), sign an EIP-3009
authorization from Monid's Base wallet, and retry with
`PAYMENT-SIGNATURE`. Monid already pays x402 upstreams from its hosted
side — is that path available to catalog connectors, and how should a def
declare it (an auth `kind`, a transport flag, or the current
empty-credential shape plus a Relay-side rule keyed on the 402)?

## Capabilities

- `alienprobe-connector`.

## Non-goals

- The path-param door forms (`/company/{q}`, `/who/{q}`, `/lei/{lei}`) —
  the same doors at the same prices as the query forms.
- `/v1/lookup/naics` ($0.004) and `/v1/lookup/vin` ($0.005) — not
  company facts; a follow-up if there is demand.
- Modelling the seller's first-call-free-per-payer rule (settled by the
  seller at payment time).

## Impact

New connector tree + three ids in `connectors/ids.lock.json`; no
schema/engine/compiler changes — version stays.
