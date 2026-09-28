# Proposal: add-connector-pieterpost

## Why

PieterPost turns structured recipient data and text into physical letters and
postcards. Its public API is a safer fit for Monid than proxying the full remote
MCP server: the API uses a stable server-side bearer key, while the MCP server
uses user-approved OAuth connections with short-lived access tokens.

The connector should expose PieterPost's complete JSON API surface: review
links, hosted checkout, wallet-funded direct send, order tracking, wallet
capabilities and balances, and credit top-ups. The connector metadata must make
the difference between review, payment-link, test-wallet, and immediate live
side effects explicit.

## What Changes

- Add provider `pieterpost` with bearer auth, base URL
  `https://pieterpost.com`, and FREE Monid usage.
- Add `pieterpost#create-compose-link`, which maps a required connector
  `idempotencyKey` to PieterPost's `Idempotency-Key` header and creates a
  short-lived review URL.
- Add `pieterpost#create-checkout-link`, which supports letter templates,
  attachments, stamp assets, postcard front assets, and hosted payment.
- Add `pieterpost#create-direct-order`, which submits a wallet-funded letter or
  postcard and starts live fulfillment when used with a live key.
- Add `pieterpost#get-order` and `pieterpost#get-wallet` for order status,
  account capabilities, and EUR/USD wallet balances.
- Add `pieterpost#create-credit-topup`, which applies test credits immediately
  or returns a live Stripe Checkout URL.
- Add the `postal-mail` category leaf.
- Add synthetic replay fixtures shaped from the live public API documentation
  and focused schema, request-mapping, success, and provider-error tests.

## Capabilities

- `pieterpost-connector`.

## Non-goals

- `POST /v1/uploads`. PieterPost requires multipart form-data, while Monid's
  connector input and request transports currently accept JSON only. Adding a
  non-working JSON declaration would misrepresent the wire contract. Existing
  uploaded asset ids are accepted by letter and postcard order fields.
- API-key management and Address Book tools. They are MCP/account surfaces, not
  endpoints in PieterPost's public v1 REST API.
- Proxying PieterPost's OAuth MCP server or exposing OAuth tokens as connector
  input.

## Impact

One provider, six endpoints, one taxonomy leaf, and the identity lock update.
No engine, compiler, ABI, or document-format change.
