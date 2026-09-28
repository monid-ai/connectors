# pieterpost-connector (delta)

## ADDED Requirements

### Requirement: PieterPost provider is a credential-isolated postal-mail surface

The provider SHALL be named `pieterpost`, use bearer authentication against
`https://pieterpost.com`, declare FREE Monid usage, and use the `postal-mail`
category. Its metadata SHALL distinguish pre-send review and hosted-payment
workflows from direct orders that spend wallet credits and start fulfillment.

#### Scenario: Credential stays at the transport boundary

- **WHEN** any PieterPost endpoint runs
- **THEN** the bearer API key is injected by the transport and is absent from
  connector input and output

### Requirement: Create a review link with deterministic retry behavior

`pieterpost#create-compose-link` SHALL accept a required `idempotencyKey`, a
structured recipient, and optional message, locale, external id, and metadata.
It SHALL move `idempotencyKey` into the `Idempotency-Key` request header and
omit it from the JSON body before calling `POST /v1/compose-links`.

#### Scenario: A retry converges on the same draft

- **WHEN** a caller repeats the same input with the same `idempotencyKey`
- **THEN** PieterPost receives the same header key and can return the original
  compose-link resource rather than creating a duplicate

#### Scenario: Review link is not a send

- **WHEN** the endpoint succeeds
- **THEN** it returns a short-lived PieterPost composer URL with FREE usage
- **AND** the call does not charge or send mail

### Requirement: Create an unpaid hosted checkout for mail

`pieterpost#create-checkout-link` SHALL accept exactly one discriminated letter
or postcard payload, a required stable `idempotencyKey`, sender email, return
URL, and optional payment/address/correlation fields. It SHALL move the
idempotency key to the request header and call `POST /v1/checkout-links`.
Letter input SHALL expose template mode, uploaded attachments, uploaded stamp
images, and the saved Business logo control. Postcard input SHALL expose an
uploaded front-image asset and template variables.

#### Scenario: Letter checkout

- **WHEN** the caller supplies `requestType: "letter"` and 1-25 letters
- **THEN** the endpoint returns PieterPost's order and hosted checkout URL with
  FREE Monid usage
- **AND** `paidAt` and `fulfilledAt` remain null until external payment and
  fulfillment occur

#### Scenario: Mixed payload is rejected before the wire

- **WHEN** a letter request also carries a postcard
- **THEN** input validation fails before any provider request

#### Scenario: Address warning is provider-error data

- **WHEN** PieterPost returns HTTP 409 with address warnings
- **THEN** the run is a zero-billed provider error and preserves the warning
  payload for caller review

### Requirement: Create a wallet-funded direct order

`pieterpost#create-direct-order` SHALL accept the same letter and postcard mail
shapes as hosted checkout, except hosted-payment fields, and SHALL require an
`idempotencyKey`. It SHALL call `POST /v1/orders` with that key in the
`Idempotency-Key` header.

#### Scenario: Test direct order

- **WHEN** a caller uses a test API key and sufficient test credits
- **THEN** PieterPost simulates debit and fulfillment and returns the completed
  order plus the remaining test wallet balance

#### Scenario: Live direct order

- **WHEN** a caller uses an approved live API key with sufficient credits
- **THEN** PieterPost debits the live wallet and starts real physical-mail
  fulfillment without a separate review or payment step

### Requirement: Read an account-scoped order

`pieterpost#get-order` SHALL require an order id, substitute it into
`GET /v1/orders/{orderId}`, and preserve PieterPost's order response or
account-scoped 404 response.

#### Scenario: Order belongs to another account or does not exist

- **WHEN** PieterPost returns `order_not_found`
- **THEN** the run is a zero-billed provider error and does not expose an order

### Requirement: Read wallet balance and capabilities

`pieterpost#get-wallet` SHALL call `GET /v1/wallet` with an explicit or
defaulted EUR/USD currency and return account capabilities and the matching
test or live wallet balance.

#### Scenario: Currency omitted

- **WHEN** the caller omits currency
- **THEN** the connector sends `currency=eur`

### Requirement: Create a credit top-up

`pieterpost#create-credit-topup` SHALL require an amount and idempotency key,
accept EUR/USD plus optional payment, metadata, and return fields, and call
`POST /v1/credits/topups` with the idempotency key in the request header.

#### Scenario: Test top-up

- **WHEN** the credential is a test API key
- **THEN** PieterPost applies the credits immediately and returns the updated
  test wallet balance

#### Scenario: Live top-up

- **WHEN** the credential is a live API key
- **THEN** PieterPost returns a pending top-up and Stripe Checkout URL
- **AND** credits are not applied until external payment succeeds

### Requirement: Multipart uploads are represented honestly

The connector SHALL NOT declare `POST /v1/uploads` as a JSON endpoint while
Monid's request contract cannot send multipart file bodies.

#### Scenario: Caller already has a PieterPost asset id

- **WHEN** a caller supplies an existing compatible asset id in a letter or
  postcard request
- **THEN** the connector relays that asset id to PieterPost
