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
```

## Core invariants (do not regress)

- **Determinism**: the compiled bundle is a pure function of repo content.
  `schema.*`/`compiler.*` config loads override-free; compile iterates sorted;
  hashing is RFC 8785. Double-compile must be byte-identical.
- **Closed-term fns**: hook functions have no imports/captures (TS-AST linted;
  whitelisted pure globals only). All IO happens in the engine, never in fns.
  Cosmetic edits must not change a fn hash (normalization guarantees this).
- **Hooks (exactly four today)**: `auth.inject`, `input.toRequest`,
  `usage.consolidate`, `output.fromResponse`. One fallback rule: endpoint ??
  provider ?? config default, leaf-wise, closest wins.
- **Billing before presentation**: `usage.consolidate` is REQUIRED and runs on
  the RAW response envelope BEFORE `fromResponse` — presentation changes can
  never change a bill. Vendor non-2xx is DATA (zero usage), not an exception.
- **Versioning**: every doc carries compiler-derived `minEngineVersion`.
  Connector-only changes never bump the engine. Any hook-ABI or doc-format
  change requires an `ENGINE_VERSION` minor bump + `doc_format_since`/
  `fn_abi_since` facts in `config.yml`, guarded by `deno task version:check`.
- **Tests run the artifact**: `testSealedUnit(id)` compiles the whole repo and
  tests the sealed unit (doc + its fn entries), replaying `fixtures/*.json`.
  Live tests gate on `<PROVIDER>_API_KEY`; synthetic fixtures carry a
  `synthetic-` filename prefix until real recordings exist.

## OpenSpec workflow

`openspec/` is spec-driven: every non-trivial change gets
`openspec/changes/<name>/{proposal.md, design.md, specs/<capability>/spec.md,
tasks.md}`.
The decision record (D-numbered) lives in `design.md` — read
`openspec/changes/define-endpoint-doc-and-engine/design.md` (D1–D29) before
extending the schema or engine. `openspec/specs/` is populated on archive.

Reserved-but-unimplemented surfaces (extend these rather than inventing new
ones): async run protocol (`zRunRunning`, `poll`/`stop`, `NOT_ASYNC` — D10/
D29), resources (removed in D19, "return with a concrete need, as their own
change").

## Conventions

- Deno 2 workspace; fmt `indentWidth: 4`; import aliases `@shared/<name>`.
- Endpoint ids are `<provider>#<endpoint>`, inferred from folder names — never
  authored.
- New hook = contract file in `shared/core/schema/hooks/` + section carrier +
  doc `zFnRef` slot + `fnKeysOf` entry + `linkFns` branch + engine phase +
  version bump. Follow the existing pattern end-to-end.
- Commit style: `<type>(<scope>): <subject>` (e.g. `feat(engine): ...`,
  `feat(connectors): ...`, `docs(openspec): ...`).
