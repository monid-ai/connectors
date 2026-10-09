# Development guide

How this repo works, component by component. The authoritative decision record
(with rationale for every choice below) is
`openspec/changes/define-endpoint-doc-and-engine/design.md` (D1–D27 + the
Concepts Reference glossary) and the per-wave change docs beside it.

## Concepts: defs → docs → bundle → sealed unit

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

## EndpointDef / ProviderDef

### Hooks, plainly

A compiled doc is a **recipe card of pure data**. Four steps of calling an API
genuinely need code, and the four doc fields that may hold it are the **hooks**
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
(compiler-linted, TypeScript-AST based; whitelisted pure globals: JSON, Math,
Object, Array, Error types); the engine reinstantiates them from source,
hash-verified.

## Compiler

The pure mapping `(defs, options) → bundle`:

- **Normalization**: fn sources are parsed with the TypeScript compiler,
  comment-stripped, AST-printed, then COMPACTED to a single line via scanner
  token-join (template/regex literal contents verbatim; a parser-authority
  AST-equality gate refuses any tokenization drift). Cosmetic edits — comments,
  wrapping, indentation, line layout — never change a fn id.
- **Interning**: identical normalized source ⇒ one fnTable entry; preset
  applications intern the factory source once with args as data.
- **Fusion**: leaf-wise fallback resolution baked into each doc (absolute url
  from path+baseUrl — path PREFIXES in baseUrls are preserved by concatenation),
  completeness-checked.
- **Determinism**: whole-repo compilation (no filters — lookups read the
  bundle), sorted iteration, RFC 8785 canonical hashing; double-compile is
  byte-identical (`--frozen-meta` pins metadata).

## Engine

`@monid/connector-engine` — standalone (zero IO at import; logging is a
structural seam; hosts code against `engine/interfaces/mod.ts`).

Pipeline:

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

Load gates fail closed in order: `BAD_DOC` → `UNSUPPORTED_DOC` → `UNKNOWN_FN` →
`LINK_INTEGRITY` → `UNSUPPORTED_FN_ABI`; run-time contract violations are
`FN_CONTRACT`. Transports: `directTransport` (local; env
`<NAME>_CREDENTIALS_<FIELD>` per declared credential field, with the bare
`<NAME>_API_KEY` alias for an `apiKey` field; injectable fetch) and the
`relayTransport` interface (hosted injection — secrets never enter the engine
process). `start/poll/stop` are Temporal-activity-shaped; `run()` is the only
sleeper.

## Usage & billing

`usage.consolidate` is THE settle fn — REQUIRED (endpoint or provider) and run
on the RAW envelope BEFORE `fromResponse` (billing truth anchors to the wire; a
presentation change can never silently change a bill). One total job, two halves
of a single move (like a parser returning `{value, rest}`): EXTRACT the
structured usage — `units` = billable quantity in vendor-NATIVE units (what
monid pricing multiplies); `cost` = the vendor's OWN reported price, converted
via `utils.money.fromDollars` (a `MonetaryValue`, micro-dollar canon);
`evidence` = audit receipts — and ABSORB those billing fields out of the payload
(`output`; absent = unchanged, so `presets.usage.perCall()` has zero
boilerplate). Not hiding, CONSOLIDATION: the same information should not appear
twice in two shapes, identical for every operator.

## Resources

A **resource** is the durable, billable thing a provider can OWN on a
workspace's behalf — a phone number, a mailbox, a VM (openspec:
`add-resource-lifecycle-saperly`, refined by `refine-resource-model`; saperly is
the proving connector). A module beside endpoints with the same authoring →
compile → sealed-unit pipeline:
`connectors/<provider>/resources/<slug>/resource.ts` with a REQUIRED `slug`
field the loader asserts against the folder (identity is declared, never
inferred), id `<provider>/<slug>`, compiled to a `zResourceDoc` in the bundle's
`resources` map and executed via `engine.loadResource(unit)`. The fn-facing
instance is an `OwnedResource` (`{resource, externalId, data, syncedAt?}`); op
ctx carries it as `data.resource`.

The def declares WHAT the resource is (`data` — the stored-snapshot schema),
what the PLATFORM may do unprompted (`lifecycle.verify` / `lifecycle.release` /
`lifecycle.refresh?` — effectful fns with the lifecycle posture: `utils.http`
against the provider origin, throw = retriable `RESOURCE_OP_FAILED`), its
always-live reads (`views: {<kind>: {label?, read}}`), and its RATE CARD
(`usage` — REQUIRED, pure data; this repo reports, the broker prices, the host
charges):

- `period {unit, count, anchor}` — anchor CREATION_TIME (rolling) or CALENDAR
  (UTC boundaries; the host pro-rates the first partial period). ONE clock per
  resource.
- `lines` — named charge lines, each either FIXED (`{consumes}` — a set draw per
  period; `amount: 0` is lawful and keeps the clock, via `resourceUsage.free()`)
  or ESTIMATED (`{price: {unit, every, consumes}}` — a projection of a dynamic
  stream). Fixed lines are sticky: the host charges max(card, the seed's
  `observedUsage[line]`).
- sibling `reconcileUsage: {<line>: {everyMs ≥ 1h, get}}` — REQUIRED for exactly
  the estimated lines (compile-checked both ways): `get` reads the vendor's
  CUMULATIVE meter over a window → `{consumes, vendorConsumes?}`; hold ticks,
  the boundary settle, and the post-teardown tail all read the same meter. Host
  policy (charge/release leads, buffers, hold cadence) lives host-side, never in
  defs.

What USERS do to a resource is ordinary ENDPOINTS, bound via ONE purpose-keyed
`resources:` block on the endpoint def — every purpose an array:
`provisions: [{id, seed}]` (≤1, compile-checked), `uses` /
`reads:
[{id, key?, as?, ensure?}]`, `updates` / `releases: [{id, key, as?}]`.
Everything derives from it: each `key` (a JSONPath into the validated input)
resolves a target and PRE-GATES ownership in canonical order (uses → updates →
releases → reads, declaration order within) — a foreign id answers a uniform
vendor-shaped 404 as data, zero usage, upstream untouched. Every GATED instance
rides into the lifecycle fns as `data.resources[alias]` (`as` ?? the key path's
last segment, unique across purposes); pure hooks stay input-only. A success
settle emits `RunCompleted.resources` (`provisions` from the seed fn on the RAW
envelope — including per-line `observedUsage`;
`releases`/`refreshes`/`reconciles` targets bucketed by purpose) — the host's
persistence work-order. `ensure` (uses/reads) runs pre-start as its own
activity: its seeds persist BEFORE the run executes, so a crash never orphans an
upstream resource. A binding also unlocks `utils.resources.owned(...)` — the
run-scoped ownership window served by the host's `ResourceReader` port
(structurally withheld elsewhere: `RESOURCES_UNDECLARED`); loading a bound doc
without a reader fails `NO_RESOURCE_READER`.

Mid-run metering is the ESTIMATE re-run: `zEstimateData` carries an optional
`elapsedMs` (absent at admission — the author's floor prices the hold; set on
cadenced re-runs), and a doc declares `usage.updateEstimateEveryMs`
(compile-checked: demands a pollable, metered run). `accrued(input, elapsedMs)`
IS `estimate(input, elapsedMs)` — the price is an estimation that syncs.
`stop()` has a voice to match: a stop fn may return a full COMPLETED envelope
(metered work SETTLES at stop — saperly's hangup), `UNRESOLVED` (host must
reconcile before money settles), or void (`STOPPED_UNSETTLED`, the classic
posture). Lifecycle fns also carry `ctx.data.run.runId` (host-stable —
deterministic vendor idempotency keys), `utils.sleep(ms)` (bounded: 30 s/call,
120 s/phase), and response `headers` on `HttpResult` (saperly's 302 `location`).

Webhooks are DECLARED on docs and EXECUTED by the host ingress, scope
POSITIONAL: a hook on the provider def is the vendor-account stream
(`webhooks[slug]`, no wrapper); a hook on a resource def is a per-resource
registration (`subscribe` required there). Each carries a declarative HMAC
`verify` descriptor (`payload` is a template that MUST contain `${rawBody}` and
`${timestamp}` — freshness bound to the HMAC) plus ONE pure
`route(delivery) → {who, what}` fn — who ∈ resource / alias / run / unhandled,
what ∈ `run` / `signal-run` / `refresh` / `ignore`. No `subscribe` = manual
registration — the host logs the callback URL to paste (saperly).

Identity is guarded by the lock: an endpoint id defaults to `request.path`
(trailing slashes stripped; declare `endpoint:` only when the native path is
transport plumbing or empty), and `connectors/ids.lock.json` commits every
published id — `deno task ids:check [--update]` fails on drift, so a vendor
route move under a derived identity breaks CI instead of renaming silently. The
LOCAL host loop: `deno task engine:run` persists provisions/releases in a Deno
KV store at `.output/local.db` (its default ownership window;
`--resources <file>` swaps in a fixture window), and
`deno task webhook simulate|listen` signs / verifies / routes deliveries per the
compiled descriptors (tunnels — cloudflared / tailscale / none — live in scripts
only; the engine never listens).

## Configuration

Top-level `config.yml`, component-first
(`schema:`/`compiler:`/`engine:`/`scripts:`), split by DETERMINISM: `schema.*`
(incl. the declared `doc_format_since`/`fn_abi_since` facts) + `compiler.*` are
the CONTRACT — loaded override-free (no env vars; test-guarded) because bundle
bytes must be a pure function of repo content. `engine:`/`scripts:` and every
`logging:` subtree are TOOLING with `@shared/app-config` precedence (env > stage

> general). Categories are a CLOSED vocabulary in `connectors/categories.ts`
> (`meta.categories` validated fail-closed at compile); the compiler aggregates
> `bundle.taxonomy`, while shelving/visibility stay hosted concerns.

## Versioning

Semver everywhere. The engine package version (`ENGINE_VERSION`) is the
compatibility contract. Every doc carries a compiler-computed (never authored)
`minEngineVersion = semverMax(doc_format_since, api of every
referenced fn)`;
the bundle carries the max plus `toolchain` provenance (recorded, never a gate).
Connector-only changes are catalog releases and never bump the engine; changing
the hook ABI or doc format requires a minor bump (guarded by
`deno task version:check`).

## Publishing the catalog

Pushing a `catalog-v<semver>` tag IS the publish button — there is no manual
workflow dispatch:

```bash
git checkout main && git pull
git tag catalog-v0.1.0          # must match catalog-v<major>.<minor>.<patch>[-pre]
git push origin catalog-v0.1.0
```

The tag push runs `.github/workflows/publish-catalog.yml`, which:

1. gates on `deno task check` + `deno task test` (red build = no release),
2. compiles and emits the split publish tree (`.output/publish/`) stamped with
   the tag,
3. creates GitHub Release `catalog-v0.1.0` with `catalog-v0.1.0.tar.gz`
   attached,
4. triggers the monid-services GitLab `catalog-publish` job — the only thing
   that touches S3/EventBridge. **Currently commented out** until monid-services
   MR 258 merges; a publish stops at the GitHub Release, and already-published
   tags can be ingested later by re-running their workflow after the step is
   re-enabled (every step is idempotent).

Prerequisites (once): repo secrets `CATALOG_PUBLISHER_PROJECT_ID` and
`CATALOG_PUBLISHER_TRIGGER_TOKEN`, and the monid-services side deployed
(declares the `catalog_publish_tag` pipeline input + ingest job).

Operational notes:

- **Retry**: every step is idempotent — if anything fails (e.g. GitLab outage),
  "Re-run all jobs" on the workflow run.
- **Rollback**: re-run the workflow of a previous good tag (re-publishes that
  tree and repoints `latest.json`), or push a new tag on an older commit.
- **Wrong tag name** (`catalog-vfoo`, tag containing `/`): the compile step
  exits 1 before anything is released.

Why tag-triggered, why a GitHub Release:

- Tag push = publish button: the release is created by CI only **after** check +
  test + compile pass, so a release can never exist without a tested artifact.
  Release-triggered publishing inverts that (a published release precedes
  validation).
- The release asset is the handoff artifact the GitLab job downloads — the URL
  is anonymous and derivable from the tag alone
  (`releases/download/<tag>/<tag>.tar.gz`) — plus the public audit trail and
  rollback source.
- Deliberately NOT Actions artifacts (90-day expiry, token required, no public
  URL) and NOT direct-to-S3 from GitHub (no AWS credentials in this public
  repo's workflows — that invariant is why the GitLab trigger exists). S3's
  `publishes/` tree is the serving copy; the release is the transport + audit
  copy.

## CLI reference

| Task                                                                                                           | What                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deno task compiler:compile [--force] [--frozen-meta] [--publish <tag>]`                                       | compile EVERYTHING to `.output/catalog.json` (cached); `--publish` also emits the split publish tree                                                              |
| `deno task catalog providers \| endpoints \| categories \| inspect <id>`                                       | browse compiled bundles (`--provider`/`--category` filters)                                                                                                       |
| `deno task catalog resources [--provider] \| inspect-resource <id>`                                            | browse compiled resource docs                                                                                                                                     |
| `deno task engine:run <id> [--body] [--query-params] [--path-params] [--resources <file>] [--scope-key <key>]` | JIT compile + execute with env credentials (flags = `RunInput` fields, kebab-case); ownership window = the local KV store (`--resources` swaps in a fixture file) |
| `deno task webhook simulate <provider> <slug> --body <json> [--execute]`                                       | sign a synthetic delivery per the compiled verify descriptor, route it, print `{who, what}` (and act on it)                                                       |
| `deno task webhook listen <provider> [--port] [--tunnel cloudflared\|tailscale\|none] [--execute]`             | serve the ingress route locally for REAL deliveries (tunnels are scripts-only)                                                                                    |
| `deno task ids:check [--update]`                                                                               | identity guard: compiled ids vs `connectors/ids.lock.json`                                                                                                        |
| `deno task record <id> <scenario> [--body] [--query-params] [--path-params]`                                   | fixture recorder: live call, {req,res} captured (headers dropped), written to fixtures/                                                                           |
| `deno task test` / `test:live`                                                                                 | replay tests (zero network) / live tests, auto-skipped without `<NAME>_CREDENTIALS_<FIELD>`                                                                       |
| `deno task check` / `lint` / `version:check`                                                                   | hygiene + contract guard                                                                                                                                          |

## Authoring guide

- **Credentials**: omit `auth.credentials` for the standard `{apiKey}` shape
  (exa does) — declare it only for non-standard shapes. No secret VALUE ever
  appears in a def, doc, bundle, or fixture. A vendor that issues SEVERAL keys
  (contactout: a work-email and a personal-email account) declares ONE
  credential shape holding every key on the provider, and no provider `inject`;
  each endpoint declares its own inline `inject` naming the key it sends. Which
  key an endpoint uses is always visible in that endpoint's file. Locally, every
  credential FIELD reads from its own variable — `<NAME>_CREDENTIALS_<FIELD>`,
  dashes and camelCase humps underscored:

  ```bash
  export EXA_CREDENTIALS_API_KEY=...                  # or the EXA_API_KEY alias
  export CONTACTOUT_CREDENTIALS_WORK_API_KEY=...
  export CONTACTOUT_CREDENTIALS_PERSONAL_API_KEY=...
  ```

  One variable per field, so the environment and `auth.credentials` correspond
  1:1. The only alias is the bare `<NAME>_API_KEY` for a field named `apiKey`;
  the canonical name wins when both are set, and a variable set but empty fails
  as `MISSING_CREDENTIAL` naming it rather than falling back.
- **Meta roles**: `summary` = one line (list views); `description` = full
  capability text (inspect/agents); `notes` = operational CAVEATS, one
  standalone fact per entry (latency, result expiry, input shapes the vendor
  rejects, parameter combinations that are silently wrong rather than errors).
  `notes` is the ONE additive leaf: the compiled doc concatenates the provider's
  then the endpoint's, so a provider states what is true of all its endpoints
  and each endpoint states only what diverges. It is also where a cross-field
  rule goes, since `.refine`/`.superRefine` cannot survive compilation. A
  constraint about ONE field stays on that field's `.describe()`. Categories:
  add the leaf to `connectors/categories.ts` in the same PR.
- **Schemas**: endpoint-local zod at `endpoints/<name>/schema/inputs.ts` — only
  what that endpoint uses; a fragment two endpoints share goes in
  `connectors/<name>/schema/`, never imported or re-exported across endpoint
  directories, and never across providers. What the engine enforces is the
  COMPILED JSON Schema, so the test is whether `z.toJSONSchema` can express the
  rule: `.strict()` → `additionalProperties: false`, `.default(n)` → `default`,
  `.enum()`/`.min()`/`.max()` → `enum`/`minimum`/`maximum`, `.regex()` →
  `pattern` — all enforced (unknown keys and bad values → INVALID_INPUT).
  `.refine`/`.superRefine` compile to NOTHING and are silently dropped, so a
  CROSS-field rule has to be documented in `notes` instead. Do not read that as
  "validation does not survive": a single-field constraint belongs in the
  schema, where it is enforced before the wire. Write `.describe()` BEFORE
  `.optional()`: a binding that derives a field with `.unwrap()` keeps only the
  inner schema, so a describe hung on the optional wrapper is silently dropped
  from the compiled doc (the compiler does not check for it). A price selector
  nested inside an optional object (kling's `settings.resolution`) is defaulted
  the same way one level down and the container is `.prefault({})` at the
  binding — `.default({})` takes the OUTPUT type and rejects `{}` — which
  compiles to `"default": {}` so the engine's `useDefaults` fills the nested
  defaults; a `.describe()` on the container does not survive `.extend()`, so
  describe the fields, not the object.
- **Fixtures**: recorded via `deno task record` (headers never captured);
  synthetic fixtures carry a `synthetic-` prefix until real keys exist.

## Repo layout

- `config.yml` — contract constants (deterministic) + tooling knobs.
- `engine/` — released as `@monid/connector-engine`: public interface
  (`interfaces/mod.ts`), load/link/execute, the `ctx.utils` host implementation
  (`fn-utils.ts`), hook-contract wrapping, transports.
- `connectors/` — `categories.ts` (leaf registry) + connector defs.
- `shared/core` — the contract, laid out by kind of content: `schema/` (zod
  shapes: hooks/ — one file per hook, fn-table/, sections/, endpoint/,
  provider/, bundle/, … + `parse.ts` uniform parsing), `presets/` (behavior),
  `load/` (IO — owns the folder==name assertion), and `catalog.ts` (pure bundle
  readers).
- `shared/{compiler,logging,testing,app-config}` — internal libs (`@shared/*`).
- `.output/` — gitignored compile cache (`catalog.json`) + the split publish
  tree (`publish/`) that catalog releases tar onto the GitHub Release. Only
  compat goldens (`shared/testing/goldens/`) are checked-in compiled artifacts.
