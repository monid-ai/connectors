# Tasks: add-connector-pieterpost

## 1. Verify the provider surface

- [x] Confirm the public API docs and live base URL.
- [x] Confirm bearer-key auth and required `Idempotency-Key` behavior.
- [x] Confirm compose-link calls do not send mail or charge a user.
- [x] Confirm checkout-link calls do not send mail before hosted payment.
- [x] Confirm direct orders debit wallet credits and start live fulfillment.
- [x] Confirm account-scoped order reads, EUR/USD wallet reads, and top-up
      behavior.
- [x] Confirm the upload route is multipart and cannot use Monid's JSON-only
      request contract.

## 2. Connector

- [x] Add provider metadata, bearer auth, free usage, and `postal-mail`.
- [x] Add create-compose-link with recipient schema and header mapping.
- [x] Add create-checkout-link with full letter/postcard asset and template
      fields plus header mapping.
- [x] Add direct order, order lookup, wallet lookup, and credit top-up.
- [ ] Add uploads after PieterPost accepts a JSON upload source or Monid adds a
      binary/multipart request channel.

## 3. Fixtures and tests

- [x] Add synthetic happy and provider-error fixtures for all six endpoints.
- [x] Cover free settlement, provider errors, schema gates, request mapping,
      and shared compiled hooks.
- [ ] Replace synthetic fixtures with scrubbed recordings when a dedicated
      PieterPost test API key is available to Monid.

## 4. Verification

- [x] Run format, lint, typecheck, replay tests, identity lock update,
      deterministic compile, version check, and catalog inspection.
