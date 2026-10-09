# Proposal: add-connector-hunterio

## Why

Hunter (hunter.io) is a live v1 monid-services provider: email
intelligence — every address published for a domain, a person's most
likely address, SMTP-level verification, free company discovery by
filters or a one-line brief, a masked cross-company people search with a
paid reveal, and person / company enrichment. Thirteen v1 defs, all
live in prod, behind one `X-API-KEY`, billed in Hunter credits.

It is the first connector whose vendor answers with NON-STANDARD 2xx
codes that mean "not yet" (202) and "failed" (222), and whose paid
endpoints each bill on a different quantity (a block of ten addresses,
an address found, a definitive verdict, a fresh reveal).

## What Changes

- **connectors/hunterio** — 13 endpoints: `domain-search`,
  `email-finder`, `email-verifier`, `email-count`, `domain-finder`,
  `discover`, `discover-ai`, `discover/people`, `multi-domain-search`,
  `multi-domain-search/reveal`, `people/find`, `companies/find`,
  `combined/find`. Ids are v1's; `discover-ai` is a pinned id on the
  `/discover` wire path (design D1).
- **The pool is Hunter credits** (owner decision 2026-09-17, design D3):
  domain-search 1 credit per started block of ten addresses
  (`PER_UNIT`·`RESULT` `every: 10`), email-finder 1 per address found,
  email-verifier 0.5 per definitive verdict, reveal 1 per fresh reveal
  with the vendor's `meta.credits_charged` as the claim, the enrichment
  trio 0.2 per profile carrying every core data point; everything else
  FREE.
- **`/email-verifier` owns a `lifecycle.start` / `poll` pair** (owner
  decision, design D2): Hunter's 202 re-polls the same GET every 10 s
  for up to 180 s; its 222 settles as a synthesized 502 with zero usage.
- **`/discover-ai` is carried at the quota gate's price in credits**
  (owner decision, design D6): v1 charged $0.10 per call as a gate on
  the account-wide 50 AI translations a month; here it is a `PER_CALL`
  line of 8.36 credits ($0.10 ÷ $0.01196).
- **v1's seven `.refine` rules compile as unions** (design D7): domain |
  company (domain-search, email-count), the email-finder's company ×
  person pairs (5 arms), at least one Discover filter (10 arms, twice),
  at least one multi-domain filter (14 arms), email | linkedin_handle.
- **Three POSTs keep v1's drill-verified wire form** (design D5):
  domain-search and discover/people POST a JSON body (the documented
  GET bracket encoding silently drops the nested filters);
  multi-domain-search POSTs with its filters in the query string and no
  body.
- **Synthetic fixtures**: shapes follow the live reference's own
  examples; no Hunter key was available.

## Capabilities

- `hunterio-connector`.

## Non-goals

- **The account balance probe** (`GET /account`) — hosted concern, never
  a catalog endpoint (v1 D10).
- **The Leads / Lists / Campaigns / Sequences / Templates / Email
  accounts / Webhooks / Team / Usage surfaces** — CRM and outreach
  state on Hunter's side, not data endpoints (v1's exclusions).
- **Endpoints the live reference has added since v1** — `domains-suggestion`,
  `domain-count`, `email-finder/found`, `email-insight` (free), Discover
  saved searches, `lookalikes` — recorded in tasks 7.2 for the owner to
  scope; not ported unasked.
- `clearbit_format` on the enrichment trio (undocumented semantics, v1
  posture); the natural-language `query` on `discover/people` (the same
  account-wide quota is reachable via `discover-ai`, once is enough).
- **No live recordings.** Replace the `synthetic-*` fixtures with
  `deno task record` output once a key exists (tasks 7.1).

## Impact

New connector tree only. No `categories.ts` change (`people-enrichment`
and `company-enrichment` exist). No engine bump, no new `Unit`, no new
preset (`presets.auth.header` carries `X-API-KEY`), no hook-ABI change.
