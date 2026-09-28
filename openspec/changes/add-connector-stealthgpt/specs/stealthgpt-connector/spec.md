# stealthgpt-connector (delta)

## ADDED Requirements

### Requirement: StealthGPT provider definition
The provider SHALL declare name `stealthgpt`, `request.baseUrl`
`https://www.stealthgpt.ai`, auth `presets.auth.header("api-token")` with
the default `{apiKey}` credential, the single credit pool `default`
("Stealth API words"), and a provider-level `output.fromError` reading
`error.message`/`error.code` when present and `message` otherwise into
`{message, code?, raw}`. It SHALL NOT declare a lifecycle.

#### Scenario: Vendor non-2xx is zero-billed data
- **WHEN** any endpoint receives a 401 `{message: "Unauthorized"}` or a 402
- **THEN** `isProviderError` is true, usage is `{credits: {}, evidence: {}}`,
  and the output carries `message` beside `raw`

### Requirement: The vendor's word meter is evidence and claim
Every endpoint SHALL be a leaf `PER_UNIT` in `CREDIT` units at amount 1.
The provider-level `usage.evidence` SHALL count `wordsSpent`, or
`creditsSpent` when `wordsSpent` is absent; the provider-level
`usage.consolidate` SHALL claim the same number and strip `wordsSpent`,
`creditsSpent`, `remainingCredits`, `billingMode`, `meteredChargedCredits`,
`tokensSpent`, `totalTokensSpent` and `systemTokensSpent` from the output.

#### Scenario: The meter settles
- **WHEN** `/api/stealthify` answers 200 with `wordsSpent: 60`
- **THEN** usage is `{credits: {default: 60}, evidence: {CREDIT: 60}}`

#### Scenario: Account fields never reach a caller
- **WHEN** any endpoint settles a 2xx
- **THEN** `wordsSpent`, `creditsSpent`, `remainingCredits`, `billingMode`
  and `meteredChargedCredits` are absent from the output

### Requirement: Estimates are the deducible floor
`/api/stealthify/detect` SHALL estimate the whitespace-separated word count
of `text`. `/api/stealthify` and `/api/stealthify/runs` SHALL estimate the
word count of `prompt`/`text` × 2.5 (rounded up) when `model` is `super`
and × 1 otherwise. `/api/stealthify/agent/runs` SHALL estimate
`{CREDIT: 0}`. `model` SHALL be required on both writer endpoints.

#### Scenario: The detector's estimate is exact
- **WHEN** `/api/stealthify/detect` is estimated with a 15-word text
- **THEN** the estimate is `{credits: {default: 15}, evidence: {CREDIT: 15}}`

#### Scenario: `super` scales the input words
- **WHEN** either writer endpoint is estimated with a 10-word text on `super`
- **THEN** the evidence is `{CREDIT: 25}`; on `standard`, `lite` or `heavy`
  it is `{CREDIT: 10}`

#### Scenario: The agent's line is present at zero
- **WHEN** `/api/stealthify/agent/runs` is estimated with any body
- **THEN** the estimate is `{credits: {}, evidence: {CREDIT: 0}}`

### Requirement: Inputs mirror the published OpenAPI, strictly
Every body SHALL be strict and mirror its published component with
optionality only; vendor defaults (`writingMode: "essay"`, `qualityMode:
"quality"`, `isMultilingual: true`, `outputFormat: "text"`) SHALL be stated
at the binding. `/api/stealthify` SHALL NOT expose `business`, `detector` or
`mode`. Neither run body SHALL expose `webhookUrl` or `webhookSecret`. The
agent body SHALL be a discriminated union on `preset` with `platform`
required on `social` only.

#### Scenario: A removed field is rejected
- **WHEN** `/api/stealthify` receives `business: true`
- **THEN** the run fails `INVALID_INPUT`

#### Scenario: A social post needs its platform
- **WHEN** `/api/stealthify/agent/runs` receives `social` without
  `platform`, or `academic` with `platform`
- **THEN** the run fails `INVALID_INPUT`

### Requirement: A run is driven to its terminal status
Both run endpoints SHALL carry a lifecycle whose `start` submits with
`idempotency-key: {runId}:submit` and whose `poll` reads `statusUrl`
(fallback: submit URL + `/{encodeURIComponent(runId)}`) until `status` is
`completed`, `failed` or `cancelled`. `queued`/`running` SHALL return
RUNNING. A status read answering `408`, `429` or `5xx` SHALL return RUNNING
with `Retry-After` seconds (clamped to [1 s, 120 s]) as the next cadence,
15 s without it. `failed` SHALL complete under `httpStatus` 500 and
`cancelled` under 499, each with `providerHttpStatus` 200 and zero usage. A
2xx status outside the published set SHALL throw. The two lifecycles SHALL
intern to one fn per phase.

#### Scenario: The finished result comes back as one call
- **WHEN** the submit answers 202 and the status route answers `running`
  then `completed` with `creditsSpent: 1390`
- **THEN** the run completes 200 with usage `{credits: {default: 1390},
  evidence: {CREDIT: 1390}}`

#### Scenario: A failed lookup holds the run
- **WHEN** the status route answers 503 with `Retry-After: 7`
- **THEN** the poll returns RUNNING with `pollAfterMs` 7000

#### Scenario: A cancelled run bills nothing
- **WHEN** the status route answers 200 with `status: "cancelled"`
- **THEN** the run reports `httpStatus` 499, `providerHttpStatus` 200 and
  zero usage

#### Scenario: One fn per phase
- **WHEN** the compiled bundle is inspected
- **THEN** both run endpoints reference the same `lifecycle.start` and
  `lifecycle.poll` fn keys
