# AI Agent Instructions for monid-connectors

Guide for AI coding agents working in this repo. Read this first, then the
relevant `openspec/changes/*/design.md` before touching code.

## What this repo is

The open connector standard for [Monid](https://monid.ai). Connectors are
authored in TypeScript (`defineProvider` / `defineEndpoint`: zod schemas + a few
small, closed-term functions), compiled into inert JSON **EndpointDocs** + a
content-addressed **fnTable**, and executed by a small generic engine. Two
released artifacts:

1. `engine/` — the generic connector engine (`@monid/connector-engine`).
2. `.output/catalog.json` — the compiled connector bundle (built by CI, never
   committed).

The legacy imperative provider adaptors live in the sibling repo
`monid-services` (`services/shared/providers/adaptors/*`); connectors are being
migrated here change-by-change.

## Structure

```
connectors/<name>/            # provider.ts + endpoints/<e>/{endpoint.ts, schema/, endpoint.test.ts, fixtures/}
engine/                       # load -> link -> execute; transports; host ABI (ctx.utils)
shared/core                   # THE contract: def/doc/hook/bundle zod schemas, presets
shared/compiler               # pure Def -> Doc mapping, fn normalization + interning
shared/testing                # testSealedUnit / runEndpoint, fixture record+replay
shared/{logging,app-config}   # logger + layered config
scripts/                      # CLI entrypoints (compile, run, catalog, record, version-check)
openspec/                     # spec-driven changes; decision record in changes/*/design.md
config.yml                    # schema.*/compiler.* = CONTRACT (no env overrides); engine/scripts = tooling
```

## Commands

```bash
deno task check && deno task test    # types + replay tests (zero network)
deno task test:live                  # live tests; auto-skip without <PROVIDER>_API_KEY
deno task engine:run 'exa#search' --body '{...}'   # JIT-compile + execute one endpoint
deno task catalog providers|endpoints|inspect <id>
deno task record <id> ...            # record real fixtures (headers dropped)
deno task compiler:compile           # full-repo deterministic compile
deno task version:check              # semver gate for ABI/format changes
deno task apify:scaffold <actorId>   # authoring-time actor input-schema scaffold
```

## Core invariants (do not regress)

- **Determinism**: the compiled bundle is a pure function of repo content.
  `schema.*`/`compiler.*` config loads override-free; compile iterates sorted;
  hashing is RFC 8785. Double-compile must be byte-identical.
- **Closed-term fns**: hook functions have no imports/captures (TS-AST linted;
  whitelisted pure globals only). All IO flows through the engine's ONE
  transport port — the four pure hooks do no IO at all; the three lifecycle
  hooks are effectful-by-capability via `utils.http` (auth injected at egress,
  fns never see credentials). Cosmetic edits must not change a fn hash
  (normalization guarantees this).
- **Hooks (seven)**: four PURE — `auth.inject`, `input.toRequest`,
  `usage.consolidate`, `output.fromResponse` — plus the EFFECTFUL lifecycle
  family — `lifecycle.start`/`poll`/`stop` (async run protocol; monid-services
  `runLifecycle`-shaped, `utils.http`/`log` in ctx). One fallback rule: endpoint
  ?? provider ?? config default, leaf-wise, closest wins.
- **Async protocol**: `request` stays REQUIRED and is DATA into the lifecycle
  (`ctx.data.request`); `lifecycle.start` (when present) replaces the engine's
  declarative execution and returns `running{state}` |
  `completed{httpStatus, output, state?}`. State is ids + billing signals only
  (engine-capped, `schema.state_max_bytes`); `timeouts.pollMs` is the cadence
  default, per-tick `pollAfterMs` overrides. Docs with a lifecycle floor at
  `schema.async_since`; sync docs are never over-pinned.
- **Billing before presentation**: `usage.consolidate` is REQUIRED and runs on
  the RAW response envelope BEFORE `fromResponse` — presentation changes can
  never change a bill. Vendor non-2xx is DATA (zero usage), not an exception;
  lifecycle fns synthesize error statuses for in-body failures and the engine
  zero-bills every non-2xx envelope (a fn cannot bill an error).
- **Versioning**: every doc carries compiler-derived `minEngineVersion`.
  Connector-only changes never bump the engine. Any hook-ABI or doc-format
  change requires an `ENGINE_VERSION` minor bump + `doc_format_since`/
  `fn_abi_since` facts in `config.yml`, guarded by `deno task version:check`.
- **Tests run the artifact**: `testSealedUnit(id)` compiles the whole repo and
  tests the sealed unit (doc + its fn entries), replaying `fixtures/*.json`.
  Live tests gate on `<PROVIDER>_API_KEY`; synthetic fixtures carry a
  `synthetic-` filename prefix until real recordings exist. Fixtures are TRIMMED
  recordings (D11): `record` caps response arrays/strings by default (wire chain
  untouched — replay matches requests only); the fixture-size lint bounds files
  (warn 32 KiB / fail 128 KiB).

## OpenSpec workflow

`openspec/` is spec-driven: every non-trivial change gets
`openspec/changes/<name>/{proposal.md, design.md, specs/<capability>/spec.md,
tasks.md}`.
The decision record (D-numbered) lives in `design.md` — read
`openspec/changes/define-endpoint-doc-and-engine/design.md` (D1–D29) before
extending the schema or engine. `openspec/specs/` is populated on archive.

The async run protocol (D10/D29's reserved surface) is IMPLEMENTED — see
`openspec/changes/add-async-run-protocol/design.md`. Still reserved: resources
(removed in D19), metered/accruing endpoints, declarative poll/stop phase arms,
`stop` result reporting — "return with a concrete need, as their own change".

## Conventions

- Deno 2 workspace; fmt `indentWidth: 4`; import aliases `@shared/<name>`.
- Endpoint ids are `<provider>#<endpoint>`, inferred from folder names — never
  authored.
- New hook = contract file in `shared/core/schema/hooks/` + section carrier +
  doc `zFnRef` slot + `fnKeysOf` entry + `linkFns` branch + engine phase +
  version bump. Follow the existing pattern end-to-end.
- Commit style: `<type>(<scope>): <subject>` (e.g. `feat(engine): ...`,
  `feat(connectors): ...`, `docs(openspec): ...`).
