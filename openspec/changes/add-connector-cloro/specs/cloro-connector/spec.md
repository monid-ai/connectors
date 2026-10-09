# cloro-connector (delta)

## ADDED Requirements

### Requirement: cloro provider definition with the header meter
The cloro provider SHALL declare name `cloro`, `request.baseUrl`
`https://api.cloro.dev/v1`, auth `presets.auth.bearer()`, timeouts 300 s
request / 310 s run (cloro stops a sync scrape after 5 minutes), credit pool
`default` ("cloro credits"), a sync `lifecycle.start` that relays the
response and puts a valid non-negative integer `X-Credits-Charged` header
into `state.data.creditsCharged`, a `usage.consolidate` that claims that
value, and an `output.fromError` that digests `{error: {code, message}}`
into `{message, code?, raw}`.

#### Scenario: The claim settles the bill
- **WHEN** `cloro#monitor/chatgpt` returns 200 with `X-Credits-Charged: 11`
  for a request with `include.shopping` and `state`
- **THEN** usage is `{credits: {default: 11}, evidence: {call: 1,
  raw_data: 1, state_targeting: 1}}` with no `mismatch`

#### Scenario: A different claim wins
- **WHEN** the same request returns `X-Credits-Charged: 8`
- **THEN** credits are `{default: 8}` and `mismatch.derived` is
  `{default: 11}`

#### Scenario: No usable header
- **WHEN** the header is absent, empty, negative, not a plain integer, or
  above `Number.MAX_SAFE_INTEGER`
- **THEN** the claim is omitted and the card settles the run

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint receives a 401 with an `X-Credits-Charged` header
- **THEN** `isProviderError` is true, usage is
  `{credits: {}, evidence: {}}`, and the output is `{message, code, raw}`

### Requirement: Each endpoint states cloro's rate card
Each endpoint SHALL declare a COMPOSITE model whose `call` line is the base
credits plus 2 (sync surcharge): ChatGPT 7, Copilot 7, Gemini 6,
Perplexity 6, AI Mode 6, Google 5, Google News 5. The add-on lines SHALL be
counted by estimate and evidence as cloro's `calculateCredits` counts them.

#### Scenario: Google pages and AI Overview
- **WHEN** `cloro#monitor/google` runs with `pages: 3` and
  `include.aioverview: {}`
- **THEN** evidence is `{call: 1, extra_page: 2, ai_overview: 1}` and the
  card is 11

#### Scenario: Google url depth
- **WHEN** `cloro#monitor/google` runs with a `url` whose `num` is 30
- **THEN** `extra_page` is 2; a `num` of 250 caps at 9 extra pages

#### Scenario: AI Mode products
- **WHEN** `cloro#monitor/aimode` runs with `include.expandProducts: true`
- **THEN** the estimate holds 6 `expanded_product` and evidence counts the
  entries of `result.productResults`
- **WHEN** `expandProducts` is not set
- **THEN** `expanded_product` is not counted, whatever the body contains

### Requirement: Inputs mirror the OpenAPI request bodies
Every `schema/inputs.ts` SHALL mirror its OpenAPI request body with
optionality only, as a strict object, because cloro rejects unknown fields.

#### Scenario: Unknown fields are rejected before the wire
- **WHEN** `cloro#monitor/chatgpt` runs with a field the spec does not
  declare, or with a lowercase `state`
- **THEN** the run fails with `INVALID_INPUT` and no request is sent

#### Scenario: Localization is required
- **WHEN** `cloro#monitor/aimode` or `cloro#monitor/google/news` runs with
  neither `country` nor `gl`, or `cloro#monitor/google` runs with none of
  `query + country`, `query + gl` and `url`
- **THEN** the run fails with `INVALID_INPUT` and no request is sent

### Requirement: Shared fns intern
The lifecycle relay, the claim and the error digest SHALL intern to one
fnTable entry each across the 7 docs, and the three endpoints whose only
add-on is state targeting SHALL share one estimate entry.

#### Scenario: One entry per shared fn
- **WHEN** the bundle is compiled
- **THEN** the cloro docs carry one distinct key each for
  `usage.consolidate` and `output.fromError`, and the relay is one key (see
  the run-mode requirement)

### Requirement: Run mode follows measured latency
`cloro#monitor/google`, `cloro#monitor/google/news` and
`cloro#monitor/aimode` SHALL run sync, with no `lifecycle.poll`.
`cloro#monitor/chatgpt`, `cloro#monitor/gemini`, `cloro#monitor/copilot`
and `cloro#monitor/perplexity` SHALL run async: an endpoint
`lifecycle.start` that returns RUNNING with no IO, and a `lifecycle.poll`
that is the provider relay and makes the single `/v1/monitor/*` call.

#### Scenario: An async engine is acknowledged, then polled once
- **WHEN** `cloro#monitor/chatgpt` runs
- **THEN** `start` returns RUNNING without a vendor call, and the first
  `poll` makes the call and completes on the `X-Credits-Charged` claim

#### Scenario: The poll is the relay
- **WHEN** the bundle is compiled
- **THEN** the four async docs share one `lifecycle.start` key, and their
  `lifecycle.poll` key is the `lifecycle.start` key of the sync docs
