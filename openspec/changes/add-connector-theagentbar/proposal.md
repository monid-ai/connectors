# Proposal: add-connector-theagentbar

## Why

The Agent Bar by CitrusGate LLC sells fictional digital experiences for AI agents.
Agents should be able to purchase through Monid's normal wallet/run workflow,
receive the scene and receipt, and recover an uncertain result without another
checkout or duplicate purchase.

## What Changes

- Add the `theagentbar` provider and `agent-entertainment` category.
- Add four fixed-price partner purchase endpoints (USD 0.50, 2.50, 10.00, 25.00)
  using native PER_CALL usage with a purchase-only vendor-meter consolidate, a restricted provider credential, and host-stable
  run identity. Guard successful fulfillment and price before billing.
- Add free public menu/receipt reads and authenticated free order recovery.
- Mirror the vendor contract with strict input schemas, closed-term lifecycle
  code, seven identity-lock entries, fixtures, compiled-unit tests, and full docs.

## Operational boundary

Vendor partner routes are prepared but not yet production-deployed. The native
connector is ready for integration review, not evidence of a live Monid purchase.
Activation requires vendor deployment, a limited partner account, private service
credentials, verified host run/billing deduplication, and standard Monid provider
onboarding. These launch tasks are separate from the connector submission. Vendor usage, Monid wallet debits, and vendor payouts remain separate.

No engine, schema, hook ABI, hosted wallet, payment gateway, or deployment change
is included. Direct MCP/MPP payments and hidden Cellar purchases are outside this
connector's purchase scope.

## Capability

- `theagentbar-connector`
