# Proposal: add-connector-brightdata

## Why

Bright Data is the web-access layer a large share of the agent ecosystem
already runs on, and the catalog has no entry for it. The two endpoints that
matter to an agent are a clean fit for the connector standard as it stands:
one host, one bearer token, two synchronous POSTs, per-request pricing
published in dollars, and no new engine capability of any kind.

It is also the first connector whose vendor requires a field the CALLER
cannot know. Every Bright Data request names a *zone* — the account-side
product configuration it runs under — and a zone only exists inside whichever
account holds the key. That makes it credential material rather than input,
and it is the first time the credential object has carried something that is
not itself a secret. Getting that seam right is most of this change.

## What Changes

- **connectors/brightdata** — 2 endpoints against
  `https://api.brightdata.com`, bearer auth, one credit pool.
  - `brightdata#serp` — SERP API: Google / Bing / Yandex / DuckDuckGo
    results pages as parsed JSON.
  - `brightdata#unlocker` — Web Unlocker API: any public URL fetched past
    CAPTCHAs, bot detection and geo-blocks, as HTML or markdown. The
    vendor's `screenshot` format is held back: the transport reads every
    body as text, which would corrupt a PNG.
- **The zone travels with the key** (D1). `auth.credentials` is
  `{apiKey, serpZone, unlockerZone}` and each endpoint's own `auth.inject`
  merges its zone into the body at egress. `zone` is therefore absent from
  both caller-facing schemas although the vendor documents it as required —
  the connector's one deliberate divergence from the published `PostBody`.
- **Two products, one wire path** (D2). SERP API and Web Unlocker API are
  both `POST /request`; the zone type is the entire difference. Both
  endpoints declare `endpoint` (`/serp`, `/unlocker`) because deriving the id
  from the native path would collide them on `brightdata#request` — the
  contactout twin posture. The shared body mirror lives at provider level and
  each endpoint adds what its own product documents (`render`, `debug` are
  Web Unlocker's alone).
- **No vendor meter** (D3). Verified live: a successful response carries no
  credits field, no cost field and no usage header, so there is no
  `usage.consolidate` and the derived fold IS the bill.
- **A failed unlock is a provider error** (D4). Past request validation,
  Bright Data answers an outer 200 whatever happened and states a failure in
  headers (`x-brd-error-code` / `x-brd-err-code`, `x-brd-status-code`) — or,
  under `format: "json"`, inside the body. A provider-level `lifecycle.start`
  reads both and settles a failure as OURS = Bright Data's result status /
  THEIRS = 200, zero-billed — the hunterio 222 posture. A target 404 is
  still a billable unlock: no verdict header, and the payload is the 404
  page. `RECORDED_RES_HEADERS` grows by the three code/status headers.
- **$1.50 per 1,000 requests** pay-as-you-go for both products — $0.0015 per
  successful request, flat `PER_CALL`, pinned from the published card and re-audited on
  repricing (the exa / apify posture). Neither result count nor page weight
  enters the bill.
- **Errors are bare strings and stay that way** (D5). Bright Data answers a
  rejected request with `Invalid token`, not a JSON envelope. The engine's
  sniffing decode already renders that faithfully, so no `output.fromError`.
- Eight real recorded fixtures, hand-minimized, covering both happy paths, a
  target 404, a failed unlock behind a 200 under `raw` and under `json`, a
  SERP `wrong_api` with a non-empty body, a rejected key and a wrong zone.

## Capabilities

- `brightdata-connector`.

## Non-goals

- **Web Scraper API is part 2.** Bright Data's third product — 1,763
  per-site datasets behind an async trigger / poll / snapshot protocol,
  priced per RECORD rather than per request — is a different billing shape
  and a different lifecycle, and it should arrive with its own change rather
  than ride in behind two synchronous endpoints.
- **Proxy zones are not ported, deliberately.** Bright Data's residential and
  mobile networks sit behind per-account KYC, which exists precisely so the
  operator knows who is scraping what. A brokered pool in front of them would
  be at odds with that, and nothing in this change touches them: both
  endpoints here are the managed products, where Bright Data itself owns
  compliance for the request.
- `POST /request?async=true` (job submit + webhook) is not ported. It is the
  same two products under the async protocol, and belongs with the Web
  Scraper API change that needs that protocol anyway.
- `x-brd-debug` is not read as a meter (D3). It reports traffic counters, but
  it is opt-in, documented as a debug aid rather than a billing receipt, and
  a HEADER — which `record` drops, so no fixture could pin it.
- No new category leaves: `web-search`, `web-scraping` and `web-extraction`
  all exist.

## Impact

New connector tree only. No new `Unit`, preset, hook, category or compiler
change; no engine change, so no `ENGINE_VERSION` move.
