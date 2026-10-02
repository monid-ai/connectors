# Proposal: add-connector-mermail

## Why

Agents that send and receive email need a mailbox they can call like any
other tool. Mermail is that mailbox: create an address, list and search
what arrived, read one message or a bounded thread, then send, reply, or
forward. The sold API is one base URL, one `x-api-key`, and a published
credit card, so it fits the connector standard without a new hook.

## What Changes

- **connectors/mermail** — 10 synchronous endpoints against
  `https://console.mermail.app`, header auth (`x-api-key`), one credit
  pool, and a provider-level `output.fromError`. No lifecycle and no
  resource. Catalog ids are short paths (`mermail#mailboxes`,
  `mermail#mailboxes/{mailboxId}/emails/send`, …). The wire path stays
  `/api/v1/...`, and send declares its own id because it shares that
  path with list.
- **Flat PER_CALL credits**, from the published card at
  https://docs.mermail.app/api-reference/overview (verified 2026-10-02):
  reads 1, send / reply / forward 5, create mailbox 10. Responses carry
  no meter, so there is no `consolidate`. A 202 send is success and
  bills; vendor non-2xx settles at zero. Credits are usage units, not
  dollars — no $/credit constant in the doc.
- **A new leaf**, `email`, because none of the existing categories name
  an agent mailbox.
- **Safe-read query flags** (`metadata_only`, `agent_safe_content`,
  `require_scan_status`, `include_held`) are on list, get, and search.
  Descriptions tell the agent to search or list before opening a body,
  and to reply on the thread instead of sending a new one.
- Synthetic fixture chains (prefixed `synthetic-`) and replay tests:
  happy settle, 401 zero-settle, and a schema gate on every endpoint.
  Live coverage is the list call, gated on `MERMAIL_API_KEY`. Mutating
  calls are not live-tested here.

## Capabilities

- `mermail-connector`.

## Non-goals

- Workspace admin, members, invites, storage, and credit-balance reads.
- Custom domains (Developer-gated).
- Drafts, scheduled send, folder and label writes, bulk actions, trash,
  and mark-read.
- Agent conversations, task triage, and draft regenerate.
- Webhooks.
- The keyless `/api/agent/v1` wallet API. Payment is the credential
  there; this connector injects an API key.
- `Idempotency-Key` on create. Connector headers are static, so the
  description tells the caller to list mailboxes after an uncertain
  create instead of pretending the header was sent.
- Dollar conversion. Plan pools are not one price.

## Impact

New connector tree plus one category leaf. No new `Unit`, preset, hook,
or compiler change, and no engine bump.
