# dataforseo-connector

## ADDED Requirements

### Requirement: One prepaid account behind HTTP Basic

The provider SHALL declare the credential shape `{login, password}` and
SHALL send `Authorization: Basic base64(login:password)` on every request,
encoding the pair as UTF-8.

#### Scenario: ASCII credentials
- **WHEN** the credentials are `test-login` / `test-password`
- **THEN** the wire carries `Authorization: Basic dGVzdC1sb2dpbjp0ZXN0LXBhc3N3b3Jk`

#### Scenario: non-ASCII credentials
- **WHEN** the login or password contains characters outside ASCII
- **THEN** the header equals `btoa` of the UTF-8 bytes of `login:password`

### Requirement: The one-task array and the envelope verdict

Every live product SHALL POST the validated body as a JSON array of one
task and SHALL settle on the body's verdict, not the transport status.

#### Scenario: success
- **WHEN** the vendor answers HTTP 200 with `tasks[0].status_code` 20000 or 40106
- **THEN** the run completes with status 200 and the caller receives `tasks[0].result`

#### Scenario: in-band failure
- **WHEN** the vendor answers HTTP 200 with any other verdict, or with `tasks: null`
- **THEN** the run completes as a provider error with v1's synthesized status (405xx → 400, 40100 → 401, 40200 → 402, 40202 → 429, 50304 → 502, …), `providerHttpStatus` 200, and zero usage

#### Scenario: a real non-2xx
- **WHEN** the vendor answers HTTP 401
- **THEN** the run completes as a provider error with status 401, zero usage, and the digest `{message, status_code, raw}`

### Requirement: The receipt is the bill

`usage.consolidate` SHALL claim the body's top-level `cost` plus the
task_post charge stashed by a queued run; the derived fold SHALL agree.

#### Scenario: a per-row product
- **WHEN** `labs/ranked-keywords` returns 3 items with `cost` 0.01236
- **THEN** usage is `{credits: {default: 0.01236}, evidence: {base_fee: 1, rows: 3}}` with no `mismatch`

#### Scenario: items_count without items
- **WHEN** the result row carries `items_count` 5 and no `items`
- **THEN** the evidence counts 5 rows

#### Scenario: a page-billed product
- **WHEN** `serp/google-organic` is called with `depth` 10 and answers with `cost` 0.002
- **THEN** usage is `{credits: {default: 0.002}, evidence: {RESULT: 10}}`

#### Scenario: an empty success
- **WHEN** a product answers 20000 with zero items
- **THEN** the request fee (or the page) is still charged and the row count is 0

### Requirement: `limit` and `depth` default to the vendor's page

Every per-row binding SHALL default `limit` and every page-billed binding
SHALL default `depth` to the vendor's documented default; the estimate
SHALL hold `limit × row + fee` or `⌈depth / page⌉ × page price` from the
given or defaulted knob.

#### Scenario: an omitted knob
- **WHEN** `labs/ranked-keywords` is estimated without `limit`
- **THEN** the estimate holds 0.012 + 100 × 0.00012 and promises `rows: 100`

#### Scenario: the hold
- **WHEN** `serp/google-organic` is estimated with `depth` 30
- **THEN** the estimate holds 0.006 and promises `RESULT: 30`

#### Scenario: holds include the documented surcharges
- **WHEN** a metered product is estimated with a priced switch on
  (`calculate_rectangles`, `load_async_ai_overview`,
  `people_also_ask_click_depth`, `include_clickstream_data`)
- **THEN** the hold rises by that switch — `serp/google-organic` with all
  three SERP switches holds 0.008, `labs/ranked-keywords` with `limit` 3
  and clickstream holds 2 × (0.012 + 3 × 0.00012)

### Requirement: Queued products poll task_get at high priority

The 25 task-only products SHALL POST `task_post` with `priority: 2`,
stash the post charge, poll `task_get`, and settle at the post charge.

#### Scenario: the chain
- **WHEN** task_post answers 20100 with a task id and `cost` 0.0012, task_get answers 40602 then 20000
- **THEN** the run completes with status 200 and usage `{credits: {default: 0.0012}, evidence: {RESULT: 10}}`

#### Scenario: throttled or upstream hiccup while polling
- **WHEN** task_get answers 40202 or HTTP 503
- **THEN** the run stays RUNNING

#### Scenario: terminal failure
- **WHEN** task_get answers a terminal 50000
- **THEN** the run completes as a provider error (502) with zero usage

### Requirement: Dictionaries filter in the endpoint

Every free dictionary SHALL accept an optional `search` and an optional
`limit` (1–1000), keep the two off the wire, and return the matching rows
— the whole list when neither is given.

#### Scenario: a search
- **WHEN** `serp/google-locations` is called with country `us`, search `united`, limit 3 against a six-row list
- **THEN** the caller receives the first three rows containing "united", usage is empty, and the wire URL is `/v3/serp/google/locations/us` with no query

#### Scenario: the whole list
- **WHEN** `serp/google-locations` is called with country `us` and no query
- **THEN** the caller receives every row of the list

#### Scenario: a catalogue
- **WHEN** `labs/filters` is called with any query parameter
- **THEN** the run is rejected with INVALID_INPUT

### Requirement: Strict mirrors

Every input object SHALL be strict; `postback_url`, `postback_data`,
`pingback_url`, `tag`, and `priority` SHALL be absent from every mirror.

#### Scenario: a callback field
- **WHEN** any body carries `postback_url`
- **THEN** the run is rejected with INVALID_INPUT
