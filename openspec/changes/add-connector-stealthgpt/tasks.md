# Tasks: add-connector-stealthgpt

## 1. Vendor surface

- [x] 1.1 Read the published OpenAPI (`docs.stealthgpt.ai/api-reference/openapi.json`)
      and the endpoint, pricing, error-handling and MCP pages
- [x] 1.2 Pin the rate card: `super` $0.05 / 100 words, `standard`/`lite`
      $0.20 / 1,000, detector one word per input word, Stealth Agent
      `ceil(outputWords × 10)` words

## 2. Provider

- [x] 2.1 `provider.ts`: `api-token` auth, baseUrl, timeouts, the `default`
      word pool, provider-level evidence and consolidate, `output.fromError`
- [x] 2.2 `connectors/categories.ts`: `text-generation`, `ai-detection`

## 3. Endpoints

- [x] 3.1 `stealthify`: strict mirror, vendor defaults at the binding
- [x] 3.2 `detect`
- [x] 3.3 `humanize-runs`: `model` required at the binding, lifecycle
- [x] 3.4 `agent-runs`: discriminated union on `preset`, same lifecycle

## 4. Fixtures and tests

- [x] 4.1 7 chains recorded against the provider key (ids and
      `remainingCredits` replaced by placeholders); 6 synthetic for states
      that cannot be induced (402, failed, cancelled, transient lookup,
      missing statusUrl)
- [x] 4.2 29 replay tests
- [x] 4.3 `deno task test:live` green for all four endpoints

## 5. Verification

- [x] 5.1 `deno task fmt` · `lint` · `check`
- [x] 5.2 `deno task test`
- [x] 5.3 `deno task version:check`, no contract-surface change
- [x] 5.4 Double-compile byte-identical
- [x] 5.5 `connectors/ids.lock.json` carries the four ids
