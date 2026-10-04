## Why

Agents asked about judge-specific filing requirements invent plausible
numbers: standing orders and individual practices live as PDFs on hundreds
of court websites and are in no model's training data. Court Rules
publishes them as structured data, and Monid is the distribution layer for
exactly this kind of tool.

## What Changes

- Add the `court-rules` provider: FREE model, bearer API key, one host.
- Add two read-only endpoints, `court-rules#api/v1/judges` and
  `court-rules#api/v1/holidays`, mirroring the vendor's published docs.
- Add the `legal-research` leaf category so endpoints can declare it.

## Impact

- Affected specs: court-rules-connector (new)
- Affected code: connectors/court-rules, connectors/categories.ts
