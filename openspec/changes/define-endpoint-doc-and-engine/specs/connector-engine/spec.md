# connector-engine (delta)

## ADDED Requirements

### Requirement: ENGINE_VERSION is the contract
The engine SHALL export `ENGINE_VERSION` equal to its package version in
`engine/deno.json`. A repo check SHALL fail when the hook ABI (contract signatures,
JsonUtil/MoneyUtil surface) or structural doc format changes without at least a minor
version bump.

#### Scenario: Version source of truth
- **WHEN** `ENGINE_VERSION` is read
- **THEN** it equals the `version` field of engine/deno.json

### Requirement: Fail-closed loading and linking
`Engine.load(sealedUnit)` SHALL apply, in order: doc parse (`BAD_DOC`);
`minEngineVersion ≤ ENGINE_VERSION` (`UNSUPPORTED_DOC`); every `$fn` key present in
the sealed unit (`UNKNOWN_FN`); `sha256(entry.src) == key` (`LINK_INTEGRITY`);
`entry.api ≤ ENGINE_VERSION` (`UNSUPPORTED_FN_ABI`). Factory entries SHALL be
applied to their `args` at link time. Fns SHALL be instantiated directly (no
sandbox) and wrapped in their hook contract's `.implement()`.

#### Scenario: Tampered fn source
- **WHEN** a sealed unit's fn entry src does not hash to its key
- **THEN** load fails with `LINK_INTEGRITY`

#### Scenario: Doc from a newer engine
- **WHEN** `doc.minEngineVersion > ENGINE_VERSION`
- **THEN** load fails with `UNSUPPORTED_DOC`

### Requirement: Execution pipeline order
`start(runInput)` SHALL execute: validate the input trio against
`input.schema` (`INVALID_INPUT`) → `input.toRequest` (if present) → build
`PreparedRequest` (pathParams `{placeholder}` substitution, queryParams →
URL query, body → JSON, static headers; auth unexecuted) →
`transport.execute` → sniffing decode → `usage.consolidate` on the RAW
envelope (THE settle fn: `{usage, output?}` — structured usage extracted,
billing fields absorbed; output absent = unchanged) → `output.fromResponse`
(consolidated output in) → validate the final output against `output.schema`
(`CONTRACT_VIOLATION`) → completed Tick. Post-response hooks are skipped on
provider error. The output SHALL be identical for every operator — the
engine has no host-gated behavior.

#### Scenario: Settle reads what it removes
- **WHEN** `usage.consolidate` extracts `costDollars.total` and returns the
  output without `costDollars`
- **THEN** usage carries the cost and `fromResponse` never sees the field

### Requirement: Sniffing decode
The engine SHALL decode every response body with one universal rule: parse as
JSON if it parses; otherwise pass the COMPLETE raw body through as a string
(a string is valid Json). Empty bodies decode to null. The engine SHALL NOT
truncate, wrap, or error on non-JSON bodies — `isProviderError` already
carries the HTTP-status signal.

#### Scenario: Vendor HTML error page
- **WHEN** the upstream returns 502 with an HTML body
- **THEN** the result is completed with `isProviderError: true` and the
  faithful HTML string as output

### Requirement: Vendor errors are data
Vendor non-2xx responses SHALL NOT throw: the run completes with
`isProviderError: true`, the decoded body as output (no fromResponse), and
zero usage. Only transport-level failures throw `EXECUTION_FAILED`
(retriable). `isProviderError` SHALL remain part of the result as the
engine's authoritative classification — callers rely on it rather than
re-deriving from httpStatus (in-body error detection lands here later).

#### Scenario: 401 from vendor
- **WHEN** the upstream returns 401
- **THEN** the result is completed with `isProviderError: true` and usage
  `units: [{amount: 0, unit: "call"}]`

### Requirement: Host ABI implementation (engine/fn-utils.ts)
The engine SHALL implement the ENTIRE `ctx.utils` surface in ONE file
(engine/fn-utils.ts; interfaces live in @shared/core): `utils.json` per the
connector-schema strictness contract and `utils.money`
(`fromDollars`/`fromMicroDollars` → micro-dollar MonetaryValue). The host
SHALL NOT appear in the fnTable; path functions implement the RFC 9535
subset.

#### Scenario: Missing path fails the run
- **WHEN** a slot fn calls `utils.json.len(v, path)` on an absent path
- **THEN** the throw surfaces as `FN_CONTRACT` (never a silent 0)

### Requirement: Slot contract enforcement (FN_CONTRACT)
The engine SHALL wrap every linked fn with its hook CONTRACT via
`.implement()`: the ctx argument validated before the call, the return
validated after — the SAME z.function factories that type the defs. A fn that
receives invalid data, throws, or returns an invalid value SHALL fail closed
with `FN_CONTRACT`.

#### Scenario: Compute returns junk
- **WHEN** usage.compute returns a bare number
- **THEN** the run fails with `FN_CONTRACT` (not a silent bad bill)

#### Scenario: Fn throws
- **WHEN** any slot fn throws
- **THEN** the run fails with `FN_CONTRACT` carrying the cause

### Requirement: Auth via Transport
The engine pipeline SHALL NOT execute `auth.inject` or see credentials.
Injectors SHALL: resolve params, validate them against the doc's
`auth.credentials` JSON Schema (`MISSING_CREDENTIAL`, fail-closed), execute the
inject fn on `{request, params}` under its slot contract, and egress only the
returned request. `PreparedRequest` SHALL carry the inject fn ref plus its fn
entry so a relay can execute it self-contained. `directTransport` SHALL resolve
params from an injectable resolver (default: env `<SLUG>_API_KEY` → apiKey)
and use an injectable `fetch`.

#### Scenario: Key absent locally
- **WHEN** directTransport resolves empty params for a provider requiring apiKey
- **THEN** the run fails with `MISSING_CREDENTIAL` before any network call

### Requirement: Temporal-shaped surfaces; run() loop; Run* result shapes
`start/poll/stop` SHALL be stateless with strict-JSON inputs/outputs and no
sleeps. Results SHALL use the zod-first `Run*` family from `@shared/core`
(schema/run/result.ts): `start/poll` return `zRunResult` — a flat,
`kind`-discriminated union of `zRunCompleted` (`httpStatus`, `output`,
`usage`, `isProviderError`) and the reserved `zRunRunning` (`state`,
`pollAfterMs`) — and `run()` returns `RunCompleted` directly. Level 1 is
sync-only: `poll` throws `NOT_ASYNC`, `stop` is a no-op. `run()` SHALL be
the only sleeping code path: start, then poll on `pollAfterMs` until
completion, honoring `timeouts.runMs` (`TIMEOUT`, calling `stop` first) and
an optional AbortSignal.

#### Scenario: Sync endpoint via run()
- **WHEN** `run()` is called on a sync endpoint
- **THEN** it returns the completed result of `start` without sleeping

### Requirement: Explicit public interface; standalone library
The engine SHALL define its public interface in `engine/interfaces/mod.ts`
(`ConnectorEngine`, `RunnableEndpoint`, `EngineCtx`, `Completed`, `Tick`,
`Transport`, `PreparedRequest`, `ParamsResolver`) with the classes
implementing them — hosts code against the interfaces. It SHALL import no IO
dependency at module load (no pino, no config reader); its default logger
SHALL be a silent no-op, with `EngineCtx.logger` accepting any structural
`Logger`. The engine SHALL contain no catalog code (bundle reading lives in
`@shared/core`) — linking stays HERE because its gates are engine
load-time guarantees and instantiation requires `new Function`, an execution
capability the contract package must never have.

#### Scenario: Engine embedded in a foreign runtime
- **WHEN** the engine module is imported without any environment or config
- **THEN** import succeeds and Engine operates with the no-op logger

### Requirement: CLI tasks (JIT run + catalog)
The repo's command scripts SHALL be built on `@cliffy/command` (subcommands,
typed flags, generated --help). `deno task engine:run <provider>#<endpoint>`
SHALL compile the whole repo (or reuse the `.output/` cache), pick the
endpoint FROM THE BUNDLE (`sealUnit`), execute it with `directTransport`,
and print the result including usage;
input SHALL be composable via `--body`, `--query`, and `--path-params` (each
JSON), with `--input` as the full-RunInput escape hatch. `deno task catalog
providers | endpoints [--provider <name>] [--category <id>] | categories |
inspect <id>` SHALL surface `@shared/core`'s catalog readers over the same
cache. `deno task record <id> <scenario>` SHALL capture a live exchange as a
replay fixture (headers never recorded).

#### Scenario: Cache hit
- **WHEN** engine:run is invoked twice with unchanged sources
- **THEN** the second invocation skips compilation

#### Scenario: Browse by category
- **WHEN** `deno task catalog endpoints --category web-search` runs
- **THEN** only endpoints whose (post-fallback) categories include
  web-search are listed
