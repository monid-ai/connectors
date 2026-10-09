# Proposal: add-connector-apollo

## Why

Apollo (apollo.io) is a live v1 monid-services provider: B2B sales
intelligence — people and company search, people and company enrichment,
complete-record lookups, job postings and company news — behind one
`x-api-key` credential on one wire surface, billed in Apollo credits from a
published per-endpoint rate card.

It is the first connector whose vendor bills **per page of search results**
(`Unit.PAGE` outside apify) and whose enrichment bills **only when a record
is matched**, so the count rule — not the model shape — decides whether a
successful 200 draws anything.

## What Changes

- **connectors/apollo** — 8 synchronous endpoints: `mixed_people/api_search`
  (free), `mixed_companies/search`, `organizations/job_postings`,
  `news_articles/search` (1 credit per page), `people/match`,
  `organizations/enrich`, `people/show`, `organizations/show` (1 credit per
  matched record), all sharing the provider's `x-api-key` auth, base URL,
  timeouts and Apollo-credits pool.
- **Search filters ride the query string** on the POST searches, arrays as
  repeated `foo[]` keys — the engine's native encoding, so there is no
  `input.toRequest` and no body (design D6).
- **No phone reveal** (owner decision 2026-09-16, design D2): Apollo answers
  a phone request with a signed 64-bit `request_id` the engine's JSON decode
  rounds; the asynchronous channels (`reveal_phone_number`, `webhook_url`,
  `poll_only`, both waterfall flags) are omitted at the binding and rejected
  before the wire. `people/match` is synchronous.
- **The rate card is Apollo's current one** (owner decision, design D3): 1
  credit per page / per matched record, no surcharge for
  `reveal_personal_emails`; the pool is Apollo credits, not v1's $0.025
  conversion.
- **Empty results draw nothing** (owner decision, design D4): every metered
  endpoint is a leaf `PER_UNIT` whose evidence counts 1 or 0 — a page with
  results, a matched record.
- **Synthetic fixtures**: shapes from the reference examples on
  docs.apollo.io — no Apollo key was available for this port.

## Capabilities

- `apollo-connector`.

## Non-goals

- **No `people/bulk_match` / `organizations/bulk_enrich`.** v1 keeps both
  `enabled: false` ("per-record credit cost across a mixed batch is hard to
  size accurately"); the port carries only what v1 runs live.
- **No phone numbers, waterfall enrichment, or webhooks** — design D2; a
  follow-up once the engine preserves out-of-range integers.
- **No `output.fromError`.** Apollo's error bodies differ per endpoint
  (`{error}`, `{error, error_code}`, `{message}`, a plain-text 401) and each
  already reads as a message; they relay verbatim.
- **No `usage.consolidate`.** A synchronous Apollo response carries no meter
  (`credits_consumed` appears only on the phone webhook payload), so there is
  no claim to lift; the literal rate table in `provider.test.ts` is the
  cross-check (design D3).
- **No live recordings.** Replace the `synthetic-*` fixtures with
  `deno task record` output once a key exists (tasks 7.1).

## Impact

New connector tree only. Connector-only: no engine bump, no new `Unit`
(`PAGE` and `RESULT` exist), no new preset, no hook-ABI change, no new
category leaf (`people-enrichment`, `company-enrichment`, `jobs`,
`company-news` exist).
