# Tasks: add-connector-venice

## 1. Connector

- [x] 1.1 `provider.ts`: bearer auth, `https://api.venice.ai/api/v1`, US-dollar
      pool, provider-level `consolidate` (plucks `cost`, sums `usd + diem`,
      omits the entry when absent/null/zero) and `fromError` (`error` →
      `error.message`)
- [x] 1.2 `chat/completions`: OpenAI-compatible mirror + `venice_parameters`;
      `max_completion_tokens` required at the binding; nano-dollar meter
      equal to the vendor claim; byte-ceiling estimate
- [x] 1.3 `embeddings`: enumerated models, five linear per-token price lines,
      `usage.prompt_tokens` evidence, byte-ceiling estimate
- [x] 1.4 `image/generate`: flat-priced models only, three per-image lines,
      `variants` default 1, `images.length` evidence
- [x] 1.5 `augment/search` (`limit` 10, `search_provider` brave at the
      binding) and `augment/scrape`: flat PER_CALL $0.01
- [x] 1.6 `text-generation` leaf added to `connectors/categories.ts`
- [x] 1.7 Five ids added to `connectors/ids.lock.json`

## 2. Fixtures & tests

- [x] 2.1 Real fixtures recorded with a vendor key (`deno task record`,
      trimmed) — chat, chat with web search, 404, embeddings, search,
      scrape, scrape refusal (400), image, and a 401 shared by every
      endpoint's provider-error test; provider-level shared chains with
      `{{request.url}}`
- [x] 2.2 Replay + schema-gate + gated-live tests per endpoint
- [x] 2.3 Live tests pass against the production API (`VENICE_API_KEY`)
- [x] 2.4 `deno task check && deno task test` pass with no network
