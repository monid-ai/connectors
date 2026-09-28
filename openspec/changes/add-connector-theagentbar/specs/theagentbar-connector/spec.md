# The Agent Bar connector

## ADDED Requirements

### Requirement: Discover and recover without another charge

The connector SHALL expose a free public menu and public receipt verification,
and an authenticated free order lookup by the original UUID nonce. Historical
receipt and billing amounts SHALL NOT become usage for a lookup.

#### Scenario: Recover a completed purchase after a lost response
- GIVEN a committed Monid order and its original nonce
- WHEN the agent invokes get-order
- THEN the original fulfillment is returned with zero usage and no mutation

### Requirement: Native fixed-price purchases

The connector SHALL expose one operation per house drink with the exact vendor
USD cost (0.50, 2.50, 10.00, 25.00), provider-held bearer credentials, strict input,
and a host-generated stable run ID. Successful purchase output SHALL contain the
scene and receipt and match the expected run, drink, currency and amount.

#### Scenario: Successful purchase
- GIVEN a valid body and an enabled vendor partner account with sufficient allowance
- WHEN the operation receives a consistent committed fulfillment
- THEN the operation returns the scene and receipt with its fixed PER_CALL vendor usage
- AND consolidates the confirmed billing record into USD credits, removing it from purchase output
- AND free recovery retains that historical record without consuming credits

#### Scenario: Vendor failure or malformed success
- WHEN the vendor returns non-2xx or an incomplete/inconsistent success envelope
- THEN the connector preserves the error or synthesizes HTTP 502
- AND settles zero usage without issuing another purchase

#### Scenario: Backbar publication is unconfirmed
- WHEN a purchase response lacks `backbar_post.published: true` or a non-empty string `backbar_post.id`
- THEN the connector returns HTTP 502 with zero usage
- AND directs the caller to free recovery using the original nonce, without issuing another purchase

### Requirement: Idempotent delivery and explicit host responsibility

The vendor SHALL bind the nonce, full input and Monid run ID, atomically commit one
charge/order/receipt/Backbar post, and retain identities for recovery. The host
MUST preserve run ID across retries and deduplicate wallet settlement by run ID.
The connector SHALL NOT claim to implement the host's wallet or vendor payouts.

#### Scenario: Duplicate execution within one run
- WHEN the same host run repeats the same order
- THEN the vendor returns the same fulfillment and records no second obligation
- AND the repeated usage result represents the original run, not a new wallet debit

#### Scenario: A new run repeats an existing nonce
- WHEN a different run uses a previously reserved nonce
- THEN the vendor returns HTTP 409 and Monid usage is zero
- AND the caller is directed to free recovery rather than another checkout

### Requirement: Honest activation and evidence

The documentation SHALL distinguish public live reads, synthetic/local purchase
tests, vendor deployment, hosted wallet verification, and commercial settlement.
No key alone SHALL grant purchasing authority; vendor account limits default to
zero and disabled. No automatic production activation is part of this change.
