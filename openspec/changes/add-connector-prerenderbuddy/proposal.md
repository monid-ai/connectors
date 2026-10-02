# Proposal: add-connector-prerenderbuddy

## Why

Prerender Buddy already exposes its own standalone AI answer collection API.
The four platform checks fit Monid's existing async lifecycle, bearer auth,
USD credit pool and vendor-reported debit contracts. Agents can discover
question-level citations and optional brand evidence without accessing PB
customer workspaces or creating a recurring subscription.

## What changes

- Add `connectors/prerenderbuddy`: four async answer endpoints (ChatGPT,
  Claude, Gemini, Perplexity) and two free, synchronous status/balance reads.
- Mirror PB's strict request schema; document API sample limitations and the
  included citation/brand evidence without claiming consumer-app coverage.
- Bind all four answer endpoints to closed-term start/poll functions. Stable
  host run IDs give retries one vendor job; transient lookups retain its ID.
- Pin the published USD per-success rates and settle against the terminal
  `billing.chargedUsd`. Override the provider meter for both free readers so
  an original job receipt cannot charge again.
- Include real recorded fixtures, sealed-artifact replay tests, a public
  rate-card drift check and provider setup/host activation documentation.
- Register the six new public IDs in the existing identity lock.

## Capability

- `prerenderbuddy-connector`

## Non-goals

No engine/schema changes, engine version bump, private workspace tools,
crawler audits, payments/top-ups, publishing or provider model selection.
PB offers no cancellation API. The connector documents interrupted-run
reconciliation instead of advertising a cancellation/refund guarantee.

## Impact

New connector and identity lock entries only. Hosted credentials, retail
pricing, settlement and 24-hour Claude lifecycle support require maintainer
agreement before catalog activation. Contact: support@prerenderbuddy.com.
