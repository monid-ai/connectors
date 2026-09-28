# Proposal: add-connector-sentisense

## Why

The catalog has crypto market data (token prices, derivatives, on-chain,
market signals) but nothing for US equities. Agents doing stock research
need the same handful of reads over and over: how the crowd and the news
feel about a ticker, what insiders, members of Congress and 13F
institutions have been buying, what options positioning says, and what the
news is.

SentiSense serves all of these from one API keyed on a plain ticker, so the
output of one call feeds the next with no id mapping. It is also an easy
fit mechanically: one base URL, one header key, eleven synchronous GETs,
and three flat per-call credit classes. No new engine capability is necessary.

## What Changes

- **connectors/sentisense**: 11 endpoints against
  `https://app.sentisense.ai/api`, auth `presets.auth.header("X-SentiSense-API-Key")`:
  - per ticker: `/v1/stocks/{ticker}/sentiment`, `/v1/rating/{ticker}`,
    `/v1/stocks/{ticker}/options/summary`, `/v1/insider/trades/{ticker}`,
    `/v1/politicians/filings/{ticker}`, `/v1/institutional/holders/{ticker}`,
    `/v1/documents/stories/ticker/{ticker}`
  - market-wide: `/v2/market-mood`, `/v1/insider/cluster-buys`,
    `/v1/documents/stories/search`, `/v1/kb/entities/search`
- **The def is SentiSense's rate card.** SentiSense meters in SentiSense
  credits, one pool (`default`), with three flat per-call classes. The
  provider's PER_CALL of 1 is the LOOKUP class (entity search, market
  mood); the ANALYTICS endpoints (sentiment, rating, stories by ticker,
  story search, insider trades, 13F holders) override it with 2; the
  ALTERNATIVE-DATA endpoints (insider cluster buys, congressional trades,
  options summary) with 4. The API reports no per-response meter, so there
  is no `consolidate`: the derived fold settles each run at its class. The
  $/credit conversion is the broker card's job.
- **Faithful mirrors, strict.** Each query-param mirror carries the
  documented params with optionality only (no `.default()`, defaults stated
  in `.describe()`), plus the single-field constraints the API itself answers
  400 on: `lookbackDays` 1 to 365, entity search `q` of at least 2
  characters, the `type`, `sortBy` and `sortDir` enums, `YYYY-MM-DD`
  dates. Caps the API clamps rather than rejects (`limit`,
  `days`) are described, not enforced. The mirrors are strict objects: the
  API silently ignores unknown query params, so a misspelled `lookbackDays`
  would otherwise answer the default window without error.
- **Errors.** A provider `output.fromError` digests `{error, message,
  suggestions?, seeInstead?}` into `{message, code?, suggestions?,
  seeInstead?, raw}`. `suggestions` (candidate tickers for an unknown
  symbol) and `seeInstead` (where the API names a better endpoint) are
  lifted because they are the caller's next move.
- **Output passes through.** No `fromResponse`: several endpoints wrap their
  payload as `{isPreview, previewReason, data}` depending on the key's plan,
  and the envelope is part of the answer. The provider notes say so.
- Three new leaf categories in `connectors/categories.ts`:
  `stock-market-data`, `stock-sentiment`, `ownership-filings`.
- Real recordings for all 11 endpoints (2026-09-24), a recorded 404
  (`entity_not_found`) and the recorded 401 body, as provider-level fixtures.

## Capabilities

- `sentisense-connector`.

## Non-goals

- The rest of the SentiSense surface (quotes, fundamentals, analyst data,
  the earnings calendar, historical metrics, the screener, ETF endpoints,
  story detail) is not ported in this change. The eleven here cover the
  sentiment, disclosure and positioning loop; the screener's plan body in
  particular deserves its own change.
- No dollar conversion in the doc: the pool is SentiSense credits.

## Impact

New connector tree, 11 new ids in `connectors/ids.lock.json`, and three
new category leaves. No new `Unit`, preset or hook, and no compiler or
engine change.
