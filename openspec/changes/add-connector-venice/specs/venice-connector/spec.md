# venice-connector (delta)

## ADDED Requirements

### Requirement: Venice provider definition
The venice provider SHALL declare name `venice`, `request.baseUrl`
`https://api.venice.ai/api/v1`, auth `presets.auth.bearer()`, a single
`default` credit pool labelled "US dollars", a provider-level
`usage.consolidate` that plucks `cost` out of the payload and claims
`cost.usd + cost.diem` (omitting the entry when `cost` is absent, null, or
sums to zero), and a provider-level `output.fromError` that reads `error`,
then `error.message`.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `venice#chat/completions`, `venice#embeddings`,
  `venice#image/generate`, `venice#augment/search`, and
  `venice#augment/scrape` exist

### Requirement: Chat billed at the vendor's reported cost
`chat/completions` SHALL meter one PER_UNIT `CREDIT` line at
$0.000000001 per unit whose evidence is
`round((cost.usd + cost.diem) × 1e9)` read off the raw envelope (0 when
absent), so the derived fold equals the consolidated claim. Its binding
SHALL require `max_completion_tokens`, and its estimate SHALL be, in
nano-dollars, `(bytes + 2000 + 8000 × images + 8000 × search + 25000 ×
scrape + 8000 × xSearch) × 12000 + max_completion_tokens × 60000 +
10000000 × search + 50000000 × scrape + 50000000 × xSearch`, where `bytes`
counts the UTF-8 bytes of text parts, assistant `tool_calls`, `tools` and
`response_format`; `images` counts image parts; and `search`, `scrape`,
`xSearch` are 1 when `enable_web_search` is `on`/`auto`,
`enable_web_scraping` is true, or `enable_x_search` is true.

#### Scenario: The hold covers injected search context
- **WHEN** a web-search run whose prompt text is 42 bytes settles at
  4,126 prompt tokens
- **THEN** the estimate is `(42 + 2000 + 8000) × 12000 + 60 × 60000 +
  10000000` nano-dollars and is greater than the settled credits

#### Scenario: Plain completion settle
- **WHEN** a run returns 200 with `cost: {usd: 0.0000126, diem: 0}`
- **THEN** usage is
  `{credits: {default: 0.0000126}, evidence: {CREDIT: 12600}}` and `cost`
  is absent from the output

#### Scenario: Web-search completion settle
- **WHEN** a run with `enable_web_search: "on"` returns 200 with
  `cost: {usd: 0.0108378, diem: 0}`
- **THEN** usage is
  `{credits: {default: 0.0108378}, evidence: {CREDIT: 10837800}}`

#### Scenario: Unbounded request rejected
- **WHEN** a caller omits `max_completion_tokens`
- **THEN** the run fails with INVALID_INPUT before any network call

### Requirement: Embeddings billed per input token by model tier
`embeddings` SHALL be a COMPOSITE of five linear PER_UNIT `TOKEN` lines —
`tier_0125` ($0.0125 / 1M), `tier_025` ($0.025 / 1M), `tier_15`
($0.15 / 1M), `tier_1625` ($0.1625 / 1M), `tier_25` ($0.25 / 1M) — with
the selected model's line counted from `usage.prompt_tokens` and estimated
from input UTF-8 bytes. `model` SHALL be enumerated and `input` SHALL
accept only a string or an array of strings.

#### Scenario: Token settle
- **WHEN** a `text-embedding-bge-m3` run returns 200 with
  `usage.prompt_tokens: 14` and `cost: null`
- **THEN** evidence is `{tier_15: 14}` and credits are `14 × 0.00000015`

#### Scenario: Token arrays rejected
- **WHEN** a caller passes token-id arrays as `input`
- **THEN** the run fails with INVALID_INPUT before any network call

### Requirement: Images billed per returned image, flat-priced models only
`image/generate` SHALL enumerate only models with one price per image —
`venice-sd35`, `lustify-sdxl`, `lustify-v7`, `lustify-v8`,
`wai-Illustrious` ($0.01), `qwen-image`, `flux-2-pro` ($0.03),
`hunyuan-image-v3`, `flux-2-max` ($0.09) — as a COMPOSITE of three
PER_UNIT `RESULT` lines estimated from `variants` (binding default 1, max 4)
and settled on `images.length`. `return_binary` SHALL NOT be exposed.

#### Scenario: One-image settle
- **WHEN** a `venice-sd35` run returns 200 with one image
- **THEN** usage is `{credits: {default: 0.01}, evidence: {img_001: 1}}`

#### Scenario: Tiered model rejected
- **WHEN** a caller passes `model: "nano-banana-2"`
- **THEN** the run fails with INVALID_INPUT before any network call

### Requirement: Flat augmentation calls
`augment/search` and `augment/scrape` SHALL each be a leaf PER_CALL at
$0.01. `augment/search` SHALL default `limit` to 10 (max 20) and
`search_provider` to `brave` at the binding, enumerating `brave` and
`google`.

#### Scenario: Search settle
- **WHEN** an `augment/search` run returns 200
- **THEN** usage is `{credits: {default: 0.01}, evidence: {CALL: 1}}`

#### Scenario: Errors are free
- **WHEN** Venice refuses a scrape of an X/Twitter URL with 400
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}` and a digested `message`
