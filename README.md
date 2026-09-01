# monid-connectors

Declarative API connectors: authored in TypeScript, **compiled to inert JSON**,
executed by a small generic engine — locally with an API key, in CI via
fixtures, and inside a hosted platform without changing a single artifact.

```
deno task engine:run 'exa#search' --body '{"query":"solid-state batteries","numResults":3}'
# requires EXA_API_KEY in the environment
deno task catalog providers                  # what exists
deno task catalog endpoints --provider exa   # …under one provider
deno task catalog endpoints --category web-search
deno task catalog categories                 # the closed vocabulary + counts
deno task catalog inspect 'exa#search'       # one endpoint's contract
```

## How it works

Authors write an `EndpointDef` (zod schemas, data, and a few strictly-typed
functions). The compiler splits every def into:

- **EndpointDoc** — pure, flat JSON. Functions are replaced by
  `{"$fn": {"key": "sha256:…"}}` content-hash references.
- **fnTable** — the normalized function sources, interned by hash: each distinct
  source is stored exactly ONCE (git-blob style), so byte-identical fns across
  endpoints point at one shared entry, and the key doubles as the tamper check.

Docs + fnTable ship together in one atomic bundle (`.output/catalog.json`) —
`providers` and `endpoints` are maps keyed by name/id, so a duplicate id cannot
even be represented. An endpoint runs from a **sealed unit** — its doc plus
exactly the fn entries it references (the statically-linked binary to the doc's
program-with-imports) — passed by value into the engine.

```
connectors/exa/{provider.ts, endpoints/*/endpoint.ts}   ==compile==>   bundle
(TypeScript defs)                                          ┌ providers  name → ProviderDoc ┐
                                                           │ endpoints  id → EndpointDoc   │
                                                           │ fnTable    hash → {src, api}  │
                                                           └───────────────────────────────┘
```

## The execution pipeline

```
validate input (JSON Schema)           → INVALID_INPUT
→ input.toRequest                        (single fn, resolved at compile)
→ build request                          (auth travels UNEXECUTED)
→ transport.execute                      credential injection happens INSIDE the port
→ sniffing decode                        JSON if it parses, else the faithful raw string
→ usage.consolidate on the RAW envelope  THE settle fn → {usage, output?}; vendor
                                         non-2xx is DATA → zero usage, no exception
→ output.fromResponse                    (the output is what the doc says —
→ validate final output                   identical for EVERY operator)
                                         → CONTRACT_VIOLATION
```

### Hooks, plainly

A compiled doc is a **recipe card of pure data**. Five steps of calling an API
genuinely need code, and the five doc fields that may hold it are the **hooks**
— a function anywhere else is rejected. Each hook has a **contract**: one exact
plug shape (`{data, utils}` in, one exact type out — a wall socket that fits one
plug), enforced three times: at write time (TypeScript), at compile time (zod
intake), and on EVERY run (the engine re-validates input and output via the
contract's `.implement()` — a bad plug stops the run with `FN_CONTRACT` instead
of producing a garbage request or a wrong bill). In the compiled doc a hook
holds a fingerprint (`sha256:…` fn id), not code — the code lives once in the
fnTable, verified against the fingerprint before rebuild.

| Hook                  | ctx.data            | returns                                         |
| --------------------- | ------------------- | ----------------------------------------------- |
| `input.toRequest`     | `{input}`           | `RunInput`                                      |
| `usage.consolidate`   | `{input, output}`   | `{usage: Usage, output?: Json}` (the settle fn) |
| `output.fromResponse` | `{input, output}`   | `Json`                                          |
| `auth.inject`         | `{request, params}` | request parts                                   |

`usage.consolidate` is THE settle fn — REQUIRED (endpoint or provider — every
endpoint must be able to settle) and run on the RAW envelope BEFORE
`fromResponse` (billing truth anchors to the wire; a presentation change can
never silently change a bill). One total job, two halves of a single move (like
a parser returning `{value, rest}`): EXTRACT the structured usage — `units` =
billable quantity in vendor-native units (what monid pricing multiplies); `cost`
= the vendor's OWN reported price, converted via `utils.money.fromDollars` (a
monid-services `MonetaryValue`, micro-dollar canon); `evidence` = audit receipts
— and ABSORB those billing fields out of the payload (`output`; absent =
unchanged, so `presets.usage.perCall()` has zero boilerplate). Not hiding,
CONSOLIDATION: the same information should not appear twice in two shapes,
identical for every operator.

### One composition rule

**Everything falls back leaf-wise, closest wins: endpoint ?? provider ?? config
default.** The provider def carries the SAME sections as the endpoint (flat —
`provider.request.baseUrl`, `provider.usage.consolidate`, …); an endpoint hook
REPLACES the provider's; meta `docsUrl`/`categories` inherit; headers merge
key-wise. The compiler fails compilation if `url`, `auth.inject`, or
`usage.consolidate` doesn't resolve anywhere.

### Two layers, one litmus

- **Host ABI** — `ctx.utils` (implemented in one place, `engine/fn-utils.ts`;
  interfaces in core): `utils.json` (`JsonUtil`) and `utils.money`
  (`MoneyUtil`), versioned with `ENGINE_VERSION`, never in the fnTable. JsonUtil
  is **strict by contract**: `get/num/len` throw on absence (a typo'd path must
  never silently bill zero); `optionalGet/optionalNum/optionalLen` return
  undefined on absence; a present value of the wrong type throws in BOTH
  variants. Transformers (`omit/pick/merge`) stay shape-tolerant.
- **Presets** — ready-made hook fns from `@shared/core`
  (`presets.transform.strip/pick/append`, `presets.auth.header/bearer`,
  `presets.usage.perCall/perResult`): connector-shaping behavior, interned into
  the fnTable as **factory** entries (the closure split into its serializable
  halves — factory source stored ONCE, per-use args ride as data, applied at
  link time; every `header(…)` across all connectors shares one row).

_Takes a plain value → `utils.*`. Fills a hook → preset (or ad-hoc fn)._

Fns must be **closed terms** — no imports, no captured variables
(compiler-linted, TypeScript-AST based); the engine reinstantiates them from
source, hash-verified.

## Configuration

Top-level `config.yml`, component-first
(`schema:`/`compiler:`/`engine:`/`cli:`), split by DETERMINISM: `schema.*` +
`compiler.*` are the CONTRACT — loaded override-free (no env vars; test-guarded)
because bundle bytes must be a pure function of repo content. `engine:`/`cli:`
and every `logging:` subtree are TOOLING with `@shared/app-config` precedence
(env > stage > general). Categories are a CLOSED vocabulary in
`connectors/categories.ts` (`meta.categories` validated fail-closed at compile);
the compiler aggregates `bundle.taxonomy`, while shelving/visibility stay hosted
concerns.

## Versioning

Semver everywhere. The engine package version (`ENGINE_VERSION`) is the
compatibility contract. Every doc carries a compiler-computed (never authored)
`minEngineVersion = semverMax(doc_format_since, api of every referenced fn)`;
the bundle carries the max plus `toolchain` provenance (`compilerVersion` —
recorded, never a gate). The engine fails closed: `UNSUPPORTED_DOC`,
`UNKNOWN_FN`, `LINK_INTEGRITY`, `UNSUPPORTED_FN_ABI`, `FN_CONTRACT`.
Connector-only changes are catalog releases and never bump the engine; changing
the hook ABI or doc format requires a minor bump (CI-enforced via
`deno task version:check`).

## Tasks

| Task                                                                     | What                                                                                    |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `deno task compiler:compile [--provider exa] [--endpoint exa#search]`    | compile to `.output/` (gitignored, cache-keyed)                                         |
| `deno task catalog providers \| endpoints \| categories \| inspect <id>` | browse compiled bundles (`--provider`/`--category` filters)                             |
| `deno task engine:run <id> --body '<json>' [--query] [--path-params]`    | JIT compile + execute with env credentials (`--input` = full-RunInput escape hatch)     |
| `deno task test`                                                         | replay tests — zero network                                                             |
| `deno task test:live`                                                    | live tests, auto-skipped without `<SLUG>_API_KEY`                                       |
| `deno task record <id> <scenario> --input '<json>'`                      | fixture recorder: live call, {req,res} captured (headers dropped), written to fixtures/ |
| `deno task check` / `lint` / `version:check`                             | hygiene + contract guard                                                                |

## Authoring a connector

```
connectors/<name>/
├── provider.ts                    # defineProvider: name, meta, auth {inject},
│                                  #   request {baseUrl}, timeouts, … (the defaults layer)
├── schema/                        # provider-shared zod (reused across endpoints)
└── endpoints/<name>/
    ├── endpoint.ts                # defineEndpoint (id "<provider>#<endpoint>" is inferred)
    ├── schema/inputs.ts           # endpoint-local zod request schemas
    ├── endpoint.test.ts           # replay + gated live tests
    └── fixtures/{happy,provider-error}.json
```

Credentials: omit `auth.credentials` for the standard `{apiKey}` shape (exa
does) — declare it only for non-standard shapes. Meta: `summary` = one line
(list views); `description` = full capability text (inspect/agents). New
category? Add the leaf to `connectors/categories.ts` in the same PR.

See `connectors/exa/` for the reference implementation and
`openspec/changes/define-endpoint-doc-and-engine/design.md` for the full
decision record (D1–D27 + the Concepts Reference glossary).

## Layout

- `config.yml` — contract constants (deterministic) + tooling knobs.
- `engine/` — released as `@monid/connector-engine`: an explicit public
  interface (`interfaces/mod.ts` — hosts code against it), load/link/execute,
  the `ctx.utils` host implementation (`fn-utils.ts`: json + money),
  hook-contract wrapping, `directTransport` (local injection) and the
  `relayTransport` interface (hosted injection — secrets never enter the engine
  process). Zero IO at import; logging is a structural seam; no catalog code.
- `connectors/` — `categories.ts` (leaf registry) + connector defs, compiled
  into the bundle.
- `shared/core` — the contract, laid out by kind of content: `schema/` (zod
  shapes: hooks/ — one file per hook, fn-table/, sections/, endpoint/,
  provider/, bundle/, … + `parse.ts` uniform parsing), `presets/` (behavior),
  `load/` (IO — owns the folder==name assertion), and `catalog.ts` (pure bundle
  readers).
- `shared/{compiler,logging,testing,app-config}` — internal libs (`@shared/*`).
- `.output/` — gitignored compile cache; CI uploads `catalog.json` as the
  release artifact. Only compat goldens (`shared/testing/goldens/`) are
  checked-in compiled artifacts.
