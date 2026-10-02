# Tasks: add-connector-mermail

## 1. Vendor surface

- [x] 1.1 Pin the sold API: base `https://console.mermail.app`, header
      `x-api-key`, credit classes read 1 / email_send 5 / provision 10
      (https://docs.mermail.app/api-reference/overview, 2026-10-02)
- [x] 1.2 Confirm 202 send/reply/forward is success, and error bodies
      are `{error}` plus optional `{code}`
- [x] 1.3 Hold back admin, domains, drafts, webhooks, and the keyless
      wallet API

## 2. Provider

- [x] 2.1 `provider.ts`: header auth, base URL, timeouts, `default`
      credit pool, `output.fromError`
- [x] 2.2 Leaf category `email`

## 3. Endpoints (10)

- [x] 3.1 List and get mailbox, create mailbox
- [x] 3.2 List, get, context, and search emails
- [x] 3.3 Send, reply, and forward, with send's catalog id distinct
      from list

## 4. Fixtures and tests

- [x] 4.1 Synthetic happy and 401 chains, `synthetic-` prefixed
- [x] 4.2 Replay tests for credits, zero-settle errors, and schema gates
- [ ] 4.3 Record real chains once a dedicated provider key is available

## 5. Verification

- [x] 5.1 `deno fmt` and `deno lint` on the connector
- [x] 5.2 Mermail replay tests: 30 passed, 1 live test ignored without a key
- [x] 5.3 `deno task version:check` — no contract-surface change
- [x] 5.4 `connectors/ids.lock.json` gains the 10 mermail ids only
