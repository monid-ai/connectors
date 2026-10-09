# GarnettWork private connector proposal

GarnettWork checks a supported secondhand listing before purchase and returns its
native decision, evidence, unknowns and limitations. This connector is limited
to the private eBay US Buy It Now PS5 Disc BUY flow.

## Contract

| Field | Value |
| --- | --- |
| Endpoint ID | `garnettwork#verify-listing` |
| HTTP request | `POST https://mcp.garnettwork.com/monid/verify` |
| Authentication | Isolated partner bearer injected by Monid; no real credential is stored here |
| Required JSON | `url` and explicit `intent: "BUY"` |
| Optional JSON | `destination: {country: "US", postal_code: "12345"}`; ZIP+4 accepted |
| Scope | eBay US, Buy It Now, PS5 Disc, BUY |
| Output | Native `garnett-deal-or-disaster-v1`; PASS / FAIL / REFUSE remain application decisions |
| Usage model | FREE is a private-pilot modeling assumption, not an agreed commercial term |

The connector does not calculate its own market price, invent a fallback
verdict, purchase an item, contact a seller, or move money. Operational HTTP and
transport failures remain errors rather than market decisions. A malformed HTTP
200 body fails output validation.

The service may return unknown or unavailable facts. Max Safe Buy may be absent
or null. Receipt metadata, when present, remains part of the native response;
the connector does not turn it into a public receipt or signature.

## Public test data

All committed fixtures are synthetic contract fixtures. They contain no live
listing identifier, receipt identifier/hash, private timestamp, live pricing,
or private verification result. They exist only to exercise request shape,
native-response passthrough, PASS / FAIL / REFUSE semantics, operational errors,
authentication injection, unknowns and output validation.

## Offline validation

```sh
deno test --allow-read --allow-env --allow-write connectors/garnettwork
deno check connectors/garnettwork/provider.ts connectors/garnettwork/endpoints/verify-listing/endpoint.test.ts
```

No network permission is required for the replay tests.

## Activation and merge prerequisites

- Monid-controlled private visibility and agreed pilot usage policy.
- Secure handoff of an isolated partner credential outside this repository.
- Separate approval for ongoing route enablement.
- Maintainer review of unrelated upstream validation issues before merge if they
  remain present on the target branch.

No Switch support, product expansion, checkout, seller contact, money movement,
consumer website change, or V3 change is included.
