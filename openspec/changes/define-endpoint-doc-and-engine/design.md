# Design: define-endpoint-doc-and-engine

Decision record (ADR-style). Each entry: context → decision → consequences.
This file is the canonical home of the design decisions converged during plan review.

## D1 — Def → Doc compilation, both shapes formal

- Context: v1 adaptors are runtime classes; monid-providers used `zCodeRef` module
  references, so compiled docs required repo code to execute.
- Decision: authors write **EndpointDef/ProviderDef** (TypeScript: live zod schemas,
  data, strictly-typed functions — v1-lifecycle style). The compiler emits
  **EndpointDoc/ProviderDoc/ResourceDoc**: pure, flat, strict RFC 8259 JSON. Every
  emitted doc is `zEndpointDoc`/`zProviderDoc`-parsed. `$fn` refs exist only in Docs.
- Consequences: catalog stores inert text; docs pass by value (RunPayload); authoring
  keeps full type safety.

## D2 — Content-addressed fn table, shipped in the bundle (not in the engine)

- Context: functions must travel somewhere. Baking them into the engine couples
  connector velocity to engine deployments; embedding source in docs bloats docs and
  duplicates shared helpers.
- Decision: every fn is canonicalized (deno fmt + comment strip), hashed (sha256),
  and interned into a bundle-level `fnTable`. Docs reference `{"$fn": {key, args?}}`.
  Docs + fnTable compile from one commit and are ingested by the Catalog atomically —
  sync by construction. Identical canonical source ⇒ one shared entry (interning).
- Consequences: engine stays generic and rarely deployed; connector changes are
  catalog releases; tampering breaks the hash chain (doc.hash covers `$fn` keys;
  engine re-verifies `sha256(src) == key` at link time).

## D3 — One semver: ENGINE_VERSION is the contract

- Context: avoid a second version axis (integer API levels) drifting from the
  package version.
- Decision: `ENGINE_VERSION` = engine/deno.json version. Fn entries carry `api`
  (the fn ABI they target); docs carry compiler-derived
  `minEngineVersion = semverMax(api of $fns, structural fields used, author raise)`;
  bundles carry `max(docs')`. patch = no contract change; minor = additive
  (doc fields, slot signatures, `J` methods — version-check enforces); major =
  breaking, goal never.
- Consequences: hosted rollout is an admission gate — the fleet advertises its
  engine version, the Catalog indexes only docs `≤ advertised`, advertisement rises
  after a deploy bakes. Backward compatibility is proven by the compat golden suite.

## D4 — Uniform fn mechanism: four slots, one shape `(ctx: {data, utils})`

- Context: reviews rejected a predefined capability registry and per-slot bespoke
  shapes; then compared ctx layouts (flat / grouped / two-param) against
  router prior art (Hono/Koa single-context vs Express split params).
- Decision: exactly four fn slots, each a single-argument
  `(ctx: { data, utils }) => T` — the grouped shape won because the
  validated/unvalidatable boundary is STRUCTURAL: `ctx.data` is pure JSON and
  strictly zod-validated per call; `ctx.utils` is host code passed through.
  - `input.transform` — `data: {input}` → `RunInput`
  - `output.transform` — `data: {input, output}` → `Json`
  - `usage.compute` — `data: {input, output}` → `Usage`
  - `auth` — `data: {request, params}` → `HttpRequestParts`
  Each slot is defined ONCE as a zod pair (`shared/schema/fn/slots.ts`:
  data schema in, return schema out) serving author typing, compiler intake
  validation, AND engine call-time enforcement (D18). No other def position may
  hold a fn — `.strict()` zod objects make that structural (no separate lint).
- Consequences: one interning/linking path; both ctx groups extend without
  signature changes; drift between typing and enforcement is impossible.

## D5 — Host ABI (`utils.json` / JsonUtil) vs fnTable presets — the layering rule

- Context: "why is JsonUtil not in the fnTable while strip is?" needed a stated
  rule; naming iterated J → engine.J → `ctx.utils.json` (grouped ctx, D4).
- Decision — two layers, one litmus:
  - **Layer 1 — host ABI**: `ctx.utils.json` (interface `JsonUtil`, defined in
    `shared/schema/json/util.ts`, implemented in `engine/json-util.ts`:
    `get/num/len/omit/pick/merge`). Engine-implemented, versioned by
    `ENGINE_VERSION`, NEVER in the fnTable — if it were, every bundle would
    re-ship the same standard library and version it per-bundle. It is to fns
    what syscalls are to programs. Future capabilities are additive ctx.utils
    fields (engine minors).
  - **Layer 2 — presets** (`shared/schema/presets/`): ready-made slot fns
    (`transform.strip/pick/append`, `auth.header/bearer/query`) whose bodies
    use ONLY ctx + their own params. They encode connector-shaping intent, so
    they intern INTO the fnTable as **parametric** entries (source hashed once,
    per-use args as data, applied at link time). "Preset" replaces the
    confusing "factory" term; `zFnEntry.kind` is `"fn" | "parametric"`.
  - Litmus: *universal, connector-agnostic primitive → host (utils); behavior
    that fills a slot → fnTable (via preset or ad-hoc fn).*
  - Paths conform to the RFC 9535 JSONPath subset (dot member + numeric index),
    validated at compile time. Fns must be closed terms (free vars = own
    parameters only, plus whitelisted pure globals incl. Error types).
- Consequences: fn sources stay tiny and hash-stable; extending the host =
  engine minor; connector behavior ships at catalog velocity.

## D6 — `usage` (final name): ONE compute fn returns units + cost + evidence

- Context: naming ping-ponged usage↔billing; v1 returned bare numbers and lost
  units; a separate path-string `capture` mechanism next to the compute fn was
  confusing and broke the functions-not-strings convention.
- Decision: top-level `usage` block (NOT under `output` — it reads the RAW
  envelope before `output.transform` strips billing fields) with a SINGLE
  function: `usage.compute` returns `{units: Measure[], cost?: Measure,
  evidence?: Record<string, Json>}`. `Measure = {amount, unit}`; `Unit` is a
  monid-services-style const object (append-only). Runtime-validated with
  `zUsage` (`BAD_USAGE`). `evidence` = audit receipts (raw values kept for
  invoices/debugging, not math) — the former `usage.capture` is deleted;
  receipts come from the same fn (e.g. `engine.J.pick(output,
  ["$.costDollars", "$.requestId"])`). Defaults: no compute ⇒ 1 `Unit.CALL`
  when output non-null; provider error ⇒ zero usage always (compute never
  runs, so no evidence on errors — accepted: evidence is best-effort, not
  contract). Usage computed BEFORE output.transform. Native units only —
  uniform pricing is the hosted Broker's job.
- Consequences: invoice-grade evidence per run; one mechanism, no parallel
  path-string convention; no per-adaptor billing code.

## D7 — Auth is a fn slot, executed by the injector (Transport/Relay)

- Context: earlier drafts used a data-only inject template; review pushed for the
  uniform fn mechanism since the Relay can execute hash-verified fns too.
- Decision: `auth: ({request, params}, J) => HttpRequestParts`, usually via sdk
  factories (`header("x-api-key")`, `bearer()`). The engine never executes auth in
  the pipeline; the **Transport** does: validate resolved `params` against the
  provider's compiled `authParams` JSON Schema (`MISSING_CREDENTIAL`, fail-closed),
  then run the fn; only the returned request egresses. `PreparedRequest` carries the
  auth `$fn` ref + its fn entry so `relayTransport` can forward it self-contained.
  Credentials are visible ONLY to the auth slot; transports redact resolved values.
- Consequences: engine↔relay separation is deployment wiring, not doc shape;
  hmac/oauth later are just auth fns.

## D8 — No sandbox

- Context: all fn sources are repo-authored, PR-reviewed, content-hash-verified.
- Decision: instantiate fns directly (`new Function`). Purity + closed-term lints
  are kept for determinism/replayability, not security. Sandboxing becomes a Catalog
  admission concern only if third-party bundles ever exist.

## D9 — Strict Json; v1 `JSONExtendedType` role moves to the Def layer

- Context: v1's `JSONExtendedType` allows live zod schemas and thunks as leaves
  because v1 defs are runtime objects.
- Decision: runtime type is strict RFC 8259 Json (no undefined/functions/schemas);
  `undefined` = key absence, pruned at edges. Live zod lives only in Defs and is
  compiled to JSON Schema draft 2020-12 (ajv-validated). Doc hashing uses JCS-style
  (RFC 8785) canonicalization.

## D10 — Engine is Temporal-shaped, zero Temporal dependency

- Decision: `load/start/poll/stop` are activity-shaped — stateless, strict-JSON
  in/out, no sleeps, deterministic given (sealed unit, input, response). Only the
  in-memory `run()` loop sleeps, and it is never used under Temporal (the hosted
  workflow re-implements the loop with `workflow.sleep`). Level 1 is sync-only:
  `poll` throws `NOT_ASYNC`, `stop` is a no-op; the Tick shape reserves the async
  protocol.

## D11 — Error taxonomy; vendor non-2xx is data

- Decision: vendor HTTP errors never throw — runs complete with
  `isProviderError: true` and zero usage (proven across all 24 v1 adaptors).
  `EngineError` codes: `UNSUPPORTED_DOC | UNKNOWN_FN | LINK_INTEGRITY |
  UNSUPPORTED_FN_ABI | BAD_DOC | BAD_USAGE | INVALID_INPUT | MISSING_CREDENTIAL |
  EXECUTION_FAILED (retriable) | DECODE_FAILED | CONTRACT_VIOLATION | NOT_ASYNC |
  TIMEOUT`. Retries belong to the orchestrator, driven by `retriable` only.

## D12 — Layout, tasks, and compile output

- Decision: top level = released artifacts (`engine/`, `connectors/`); internal libs
  under `shared/*` (`@shared/<name>`), mirroring monid-services. Compile output goes
  to gitignored `.output/`, cache-keyed by `sha256(canonical inputs) + ENGINE_VERSION`;
  CI builds and uploads `.output/catalog.json` as the release artifact (determinism =
  compile twice, byte-compare). Only compat goldens (`shared/testing/goldens/`) are
  checked-in compiled artifacts. Tasks: `compiler:compile [--provider|--endpoint]`,
  `engine:run <id> --input '…'` (JIT compile through the cache), `check`, `test`,
  `test:live`, `record`, `version:check`.

## D13 — Doc field decisions (review-resolved)

- No `kind` field on docs (bundle arrays discriminate). `specVersion: 1` = doc
  format version.
- `id` = `<providerSlug>#<endpointFolder>`, always inferred, never authored; no
  top-level `name` (humans read `meta.displayName`).
- `input` is required (`{}` = takes no input) with v1-compatible trio
  `body/queryParams/pathParams`; `input.transform` (not `request.prepare`).
- `output.schema` validates the FINAL, post-transform output.
- `FN_SRC_MAX = 32 KiB` — a tunable lint bound (~8× largest v1 transform), not
  architecture.
- Provider fusion: servers/auth/timeouts pushed down into endpoints at compile;
  provider `meta` lives only on ProviderDoc, which carries an endpoint index for
  cheap "what exists" queries.
- Zod schema layout — symmetric `schema/` folders at every sharing scope:
  endpoint-local `endpoints/<name>/schema/inputs.ts` (later `outputs.ts`);
  provider-shared `connectors/<slug>/schema/<topic>.ts`. Sharing WITHIN a
  provider only, never cross-provider (lint-enforced).

## D14 — The JSON standards map (four specs, one job each)

- Context: "we use >2 JSON specs — should we merge?"
- Decision: they are not competing versions; all four operate ON one data
  format, and each is pinned to one job. RFC 8259 strict JSON = the VALUE type
  (`json/type.ts`); JSON Schema draft 2020-12 = the serializable VALIDATION
  language (schemas must travel inside docs as data; zod emits it, ajv checks
  it; the ONE versioned pick — pinned in config.yml
  `contract.schema.json_schema_dialect`); RFC 8785 JCS = canonical
  SERIALIZATION for hashing (`json/canonical.ts` — a published standard so
  Relay/Catalog/other languages can reproduce our hashes); RFC 9535 subset =
  PATH grammar for addressing (`json/path.ts`). File layout mirrors the map.

## D15 — Zod-first everywhere; seed → define → def; sdk merged into schema

- Decision: every data type = zod schema → inferred type (monid-services
  style). `EndpointDefSeed = z.input<zEndpointDef>` and
  `EndpointDef = z.output<zEndpointDef>`; `defineEndpoint(seed)` IS
  `zEndpointDef.parse(seed)` (defaults via `.default()`, cross-field rules via
  `.refine`, strictness doubles as the stray-fn/`$fn`-literal lint). The former
  @shared/sdk is absorbed into @shared/schema (defines, preset(), presets/*);
  deps flatten to `schema ← {compiler, engine, testing, connectors}`.
  Compiler re-parses defs on intake and zod-parses every emitted doc + the
  bundle; engine parses sealed units at load. The deliberate exceptions to
  zod-first: `JsonUtil` (methods aren't structurally validatable — carried via
  z.custom) and fn values inside defs (z.custom function carriers typed by the
  slot fn types).

## D16 — Categories: predefined LEAVES here, TOPS/visibility hosted (v1 round-4)

- Decision: `meta.categories` is a CLOSED vocabulary — leaf ids only, validated
  fail-closed at compile against `connectors/categories.ts`
  (`defineLeafCategories`; adding a leaf = same-PR registry edit). `meta.tags`
  stays the open, search-only escape valve. The compiler aggregates
  `bundle.taxonomy` = full leaf registry + membership (leafId → endpointIds).
  TOP groups ("Search & SEO"), provider placement (the derived
  `Search & SEO → Exa → exa#search` tier), and show/hide policy live in the
  HOSTED Catalog manifest exactly as monid-services does it today (linking as
  allowlist, hidden flags, query-time expansion — re-shelving is a manifest
  deploy, no recompile). Visibility is policy, not identity — never in bundles.

## D17 — config.yml (app-config style) with a determinism split; toolchain provenance

- Decision: one top-level `config.yml`, monid-services app-config pattern
  (the loader lib copied to `shared/app-config`, trimmed of pino/AWS deps).
  Primary split = DETERMINISM: `contract:` (spec_version, json_schema_dialect,
  fn_src_max_bytes, baseline_engine_version, doc size bounds, default
  timeouts) is loaded OVERRIDE-FREE by `shared/schema/config.ts` — no env
  vars, no stage sections — because bundle bytes must be a pure function of
  repo content (guarded by a test asserting the loader never touches
  Deno.env). `tooling:` keeps full app-config precedence (env > stage >
  general). Component subsections (schema/compiler) group values by OWNER;
  there is no `contract.engine:` by design (the engine's contract is
  ENGINE_VERSION + the fn ABI in code) and no `sdk:` (merged into schema).
  `zDefaultAuthParams` stays in code — it is a zod schema, not a YAML knob.
  Compiler versioning: `bundle.toolchain = {compilerVersion,
  builtWithEngineVersion}` is PROVENANCE, never a gate — the engine gates only
  on minEngineVersion + specVersion (a compiler-version gate would be a second
  compatibility axis).

## D18 — Canonicalization via the TypeScript printer; engine enforces slot contracts

- Decision: fn-source canonicalization = `ts.createSourceFile` +
  `ts.createPrinter({removeComments: true})` — parse → strip comments →
  deterministic print, in-process. This deleted both the hand-rolled
  string-aware comment stripper and the `deno fmt` subprocess (npm:typescript
  was already a dependency for the closed-term lint; tree-sitter was rejected:
  native dep + error-tolerant grammar, worse than the language's own parser).
  At run time the engine wraps every linked fn in its slot's zod pair
  (`wrapSlot`): ctx.data validated before the call, the return validated
  after — violations are fail-closed `FN_CONTRACT` (absorbing the former
  BAD_USAGE as the usage-slot case). ctx.data's `output` field rides as
  z.custom (JSON by construction from the engine's own decode; re-walking
  multi-MB payloads per call would be pure overhead) — returns get the full
  strict validation.

**Amended (round 9) — the normal form is COMPACT.** Review asked why the
fnTable still carried newlines/tabs; investigating exposed that the TS
printer is LAYOUT-SENSITIVE (it preserves the source's single-vs-multi-line
object layout), so the printed form was never fully canonical — the same AST
could hash differently depending on author line breaks. Fix: after the
comment-stripping AST print, a COMPACT pass re-tokenizes the printed output
with TypeScript's own scanner and joins tokens on one line (space only where
concatenation would merge tokens; `}` inside template substitutions and
non-division slashes re-scanned via reScanTemplateToken/reScanSlashToken;
string/template token text copied VERBATIM — semantic newlines inside
template literals survive). Safe because printer output never relies on ASI
(explicit semicolons), and guarded by a PARSER-AUTHORITY gate: the compacted
source is re-parsed and must be structurally AST-equal to the printed form —
a wrong regex/template guess throws at compile time, never emits. Rejected:
esbuild `minifyWhitespace` (wasm/native dependency; byte-output coupled to
its version) and naive whitespace stripping (ASI-unsafe, string-blind).
`({ data, utils }) => ({\n    ...data.input\n})` normalizes to
`({data,utils})=>({...data.input})`.

## D19 — Pipeline names and shapes (supersedes parts of D4/D6/D13; amended round 4)

- Context: review round 3 renamed the pipeline for symmetry and split hook
  configuration from data configuration; round 4 unified the section shapes.
- Decision:
  - `input.schema.{body,queryParams,pathParams}` (the validated trio) +
    `input.toRequest` (hook, formerly `input.transform`).
  - `output.fromResponse` (hook, formerly `output.transform`) +
    `output.schema` (validates the FINAL, post-fromResponse output).
  - `request.path` required (`^\/`), optional `request.baseUrl`; the compiler
    resolves the absolute `doc.request.url` with fallback to
    `provider.request.baseUrl` — neither present is a compile error
    (replaces the `servers.default` map).
  - The SECTION SCHEMAS ARE SHARED between EndpointDef and ProviderDef
    (schema/sections/): one `zInputSection`, `zOutputSection`,
    `zUsageSection`, `zAuthSection`, `zRequestDefaults`/`zEndpointRequest`,
    `zTimeoutsSeed` — no provider-specific hook types.
  - Meta split: `zBaseMeta` → `zEndpointMeta` (+categories) / `zProviderMeta`
    (+homepageUrl). Auth grouped: `auth: {inject?, credentials?}` — doc
    carries `auth.credentials` as JSON Schema (shape, never values); default
    credentials `z.object({apiKey})` — which is why most providers (exa
    included) never declare it; only non-standard shapes do.
  - Resources are REMOVED entirely (no current connector uses them; they
    return with a concrete need, as their own change).
- Consequences: def and doc read as the request lifecycle
  (schema → toRequest → request → fromResponse → schema); grep-friendly
  names; authors move a section between endpoint and provider without
  renaming anything.

## D20 — ONE composition rule: leaf-wise fallback, everywhere (round 4; replaces chain-vs-fallback)

- Context: round 3 gave hooks CHAIN semantics (ordered `$fn` arrays) and data
  FALLBACK semantics. Review round 4 rejected the split: the mental model is
  "the provider is the defaults layer; the endpoint overrides; the compiler
  checks required things resolve somewhere" — two rules where one suffices.
- Decision — one rule, no exceptions: **everything resolves LEAF-WISE,
  closest wins: endpoint ?? provider ?? config default.**
  - Hooks too: an endpoint `toRequest`/`fromResponse` REPLACES the
    provider's. Docs store a single optional `$fn` ref per hook — the chain
    arrays are deleted. (No current connector chains; if a real connector
    ever needs provider AND endpoint hooks to both run, chaining returns as
    its own justified change.)
  - Meta leaves share into the doc as well: endpoint `docsUrl` and
    `categories` fall back to the provider's; `displayName`/`summary` stay
    endpoint-required (identity is not defaultable).
  - Headers merge key-wise — each header key is a leaf (endpoint key wins).
  - Compiler completeness check after merge, failing with an error naming the
    endpoint and both fix sites: absolute url (path+baseUrl), `auth.inject`,
    and `usage.compute` (endpoint ?? provider; neither = compile error —
    every endpoint must be able to settle; the implicit 1-call default died:
    silence is not a billing policy; `presets.usage.perCall()/perResult(path)`
    kill the boilerplate). Vendor error still forces zero usage (D6 stands).
  - **Shared section fields are `.optional()`, NEVER `.default()`** —
    `.default()` fires at def-parse time PER LEVEL, materializing the
    default on a scope that said nothing and SHADOWING the other scope's
    explicit value (e.g. an endpoint overriding only `auth.inject` would get
    default credentials instead of its provider's explicit shape). Terminal
    defaults (`zDefaultCredentials`, config timeouts) are applied by the
    COMPILER after fallback resolution. `.default()` stays correct for
    single-level schemas (caller-input bodies like zExaSearchBody).
  - The `defaults:` wrapper on ProviderDef is GONE — provider sections sit
    flat (`provider.request.baseUrl`, `provider.timeouts`, …), mirroring the
    endpoint field paths exactly. The wrapper was a second, redundant signal
    applied inconsistently (auth/usage were never under it); the composition
    rule is keyed on the FIELD, not on nesting.
- Consequences: minimal endpoints (meta + request + input.schema); one rule
  to teach; provider fns intern only when some endpoint actually resolves to
  them (no orphan-entry hazard, no lazy-interning machinery).

## D21 — Sniffing decode; `usage.redact` REMOVED from the standard (round 4 reversal)

- Context: round 3 added `usage.redact` as a host-gated fifth slot (OSS skips,
  hosted runs). Round-4 review rejected it on OSS-optics grounds: a doc field
  whose only purpose is hiding data from some callers has no place in an open
  standard — "the hosted engine runs it, yours doesn't" reads exactly like
  the project is built to hide things. (A data-driven `redactKeys` variant
  was also proposed and rejected — insufficient flexibility.)
- Decision:
  - `usage.redact`, `UsageRedactSlot`, and `EngineCtx.applyUsageRedaction`
    are DELETED. There are FOUR slots. The engine's output is ALWAYS what the
    doc says — identical for every operator; nothing in the format behaves
    differently for different hosts.
  - Hiding a field for EVERYONE is an honest `output.fromResponse` transform:
    visible in the doc, same for all callers.
  - Hosted redaction/post-processing is a hosted-platform concern OUTSIDE
    monid-connectors (the hosted worker owns its pipeline). Nothing in the
    doc format supports or implies it.
  - The sniffing decode stays: the engine parses every body as JSON if it
    parses, else passes the COMPLETE raw body through as a faithful string
    (a string IS Json). No truncation, no error-wrapping — `isProviderError`
    already flags vendor error pages via HTTP status. `DECODE_FAILED` stays
    removed from the taxonomy.
- Consequences: exa keeps `costDollars` in its output (usage still extracts
  cost + evidence from the raw envelope BEFORE fromResponse); the OSS
  engine's behavior is fully described by public artifacts.

## D22 — Semver everywhere; minEngineVersion is auto-only (amends D3/D13)

- Decision: every version in the system is semver, including
  `specVersion: "1.0.0"` (was the integer 1). config.yml renames:
  `baseline_engine_version` → `doc_format_since` (oldest engine understanding
  the doc format — the floor), new `fn_abi_since` (engine release of the
  current fn ABI — stamped onto every compiled fn entry as `api`).
  `minEngineVersion = semverMax(doc_format_since, api of every referenced
  fn)` — computed, never authored (the author-raise field died: an authored
  floor either duplicates the computation or lies).
- Consequences: one comparison algebra for every gate; version-check owns the
  "did the contract surface move" question.

## D23 — @shared/core layout v2: schema/ vs presets/ vs load/; bundle maps; uniform parsing (round 4)

- Context: the flat round-3 layout mixed three kinds of content — `fn/` held
  slot contracts, ctx shapes, fnTable machinery AND the preset marker; def
  sections were duplicated between endpoint/ and provider/; review asked for
  a clear schema-vs-presets split and questioned array-shaped bundles.
- Decision:
  - **Three kinds of content, three folders**: `schema/` = the zod CONTRACT
    SHAPES (`common/ json/ usage/ meta/ taxonomy/ slots/ fn-table/ sections/
    endpoint/ provider/ bundle/` + `parse.ts`); `presets/` = BEHAVIOR (the
    `preset()` marker moved here from fn/); `load/` = IO (dynamic imports of
    authoring modules — renamed `loadConnectorDefs` / `loadCategoryRegistry`
    for what they actually do; categories sit there because loading the
    registry IS the same operation, not because categories "belong to
    loading"). `catalog.ts` (pure bundle readers: listProviders /
    listEndpoints / listCategories / inspectEndpoint) lives in CORE — it
    needs no execution (engine) and no compilation (compiler).
  - **`schema/slots/` = one file per slot**, each slot's ctx data shape
    DEFINED BESIDE its z.function factory (`to-request.ts` holds
    `zToRequestData` + `InputToRequestSlot` + the carrier); `ctx.ts` holds
    the shared plumbing + both carriers; `fn-table/` holds the doc-side `$fn`
    machinery (ref, entry). `schema/sections/` holds the def sections shared
    by both scopes (D19).
  - **Bundle maps**: `providers: Record<slug, ProviderDoc>`, `endpoints:
    Record<id, EndpointDoc>` (matching fnTable). Uniqueness by construction —
    a duplicate id cannot even be represented; O(1) `sealUnit` lookup.
    Accepted cost: the key duplicates the doc's identity (docs keep id/slug
    because sealed units travel self-contained), so superRefine checks
    key==identity. Determinism unaffected: the compiler inserts in sorted
    order and RFC 8785 sorts keys regardless. Compile-side complexity:
    `endpoints[id] = doc` instead of `.push(doc)` — negligible.
  - **Uniform parsing**: the monid-services parser.ts pattern ported as
    `schema/parse.ts` (`parseSchema`/`createParser` + `formatZodError` →
    `ValidationError` with a context label and sorted path→messages JSON).
    Every `.parse` in defines, compiler intake, config, and doc emission goes
    through it; the engine keeps safeParse for error-CODE mapping but formats
    with `formatZodError`.
  - **`z.json()` adopted**: `zJson: z.ZodType<Json, Json> = z.json()` — zod
    v4 ships the exact recursive union; v4 `z.number()` already rejects
    NaN/±Infinity so RFC 8259 strictness holds; our pervasive `Json` alias is
    pinned via the annotation. ~20 hand-rolled lines died.
  - **Ids are parsed ONCE at the CLI boundary**: the `<provider>#<endpoint>`
    id form is user-facing only (`engine:run`, `catalog inspect`, `record`);
    `scripts/lib.ts parseEndpointId` splits it into the structured
    `LoadFilter {provider, endpoint(bare name, requires provider)}` — no id
    strings, no `split("#")`, no dual-encoding precedence inside core.
  - **Compiler sort-then-loop is determinism**, now documented at the sort
    site: filesystem enumeration order is platform-dependent and iteration
    order decides fnTable insertion (first occurrence wins provenance);
    sorting by slug/name makes the bundle a pure function of repo content.
  - Carried from round 3: `@shared/logging` (structural Logger + pino
    adaptor; engine default = silent no-op, type-only import); config.yml
    component-first with the `logging:` tooling carve-out; `canonicalize` npm
    for RFC 8785; presets namespaced (`auth.query` still parked for semrush).
- Consequences: "where does this go?" has a one-word answer (shape/behavior/
  IO); dependency arrows stay `core ← {compiler, engine, testing,
  connectors}`; the engine remains a zero-config, zero-IO library.

## D24 — JsonUtil strictness: absence is opt-in, mismatch always throws (round 4; amends D5)

- Context: the lenient lookups were silently wrong: `len` returned 0 for a
  missing/non-array path — a typo'd path BILLED ZERO without a sound.
- Decision:
  - Lookups are STRICT by default: `get`/`num`/`len` throw when the path is
    absent. Explicit `optionalGet`/`optionalNum`/`optionalLen` return
    `undefined` when absent.
  - Type mismatch ALWAYS throws — in both variants. "Optional" means "may be
    absent", never "may be garbage": a present value of the wrong shape is a
    schema surprise to surface, not coerce. Invalid path SYNTAX always throws
    (a bad path is a bug, not absence).
  - Throws inside slot fns surface as FN_CONTRACT — wrong bills fail closed
    instead of settling at 0.
  - Shape-tolerant TRANSFORMERS stay lenient by design: `omit` walks whatever
    it finds; `pick` skips absent paths (best-effort receipts); `merge`
    replaces non-objects.
  - exa: `costDollars` read with `optionalNum` (the vendor sometimes omits
    it); `len($.results)` stays strict (missing results on a 2xx is an
    anomaly worth failing).
- Consequences: the JsonUtil surface changed (fn ABI) — pre-release, so
  `fn_abi_since` stays 0.1.0; the interface + engine impl document the
  contract in one voice.

## D25 — Meta trim; result shape; CLI surface (round 4; amends D13)

- Decision:
  - `meta.deprecated` REMOVED (defined, consumed nowhere — returns with a
    real deprecation story). `meta.tags` REMOVED (referenced only in an error
    hint; categories is the one browse/search vocabulary — tags return when
    search actually needs free-form labels).
  - `meta.description` kept with roles finally defined: `summary` = ONE line
    for list views (catalog rows); `description` = full capability text for
    inspect views and agent consumption. Simplified `string[]` → `string`.
    The rich v1 monid-services texts were ported into exa's descriptions
    (minus the stale "One call = one charged unit" sentence — usage now
    reports per-result units + vendor-reported usd cost).
  - `Completed.isProviderError` KEPT: derivable from httpStatus today, but it
    is the ENGINE's authoritative classification (drives zero-usage forcing),
    and vendors that signal errors in-body with HTTP 200 will be classified
    here when doc-level detection lands — callers must not re-derive it.
  - `cost` and `units` KEEP their names (a `vendorCost` rename was proposed
    and dropped). Meanings: `units` = billable quantity in vendor-native
    units (what monid pricing multiplies); `cost` = the vendor's OWN reported
    price, READ from the response, never computed; `evidence` = receipts.
  - CLI surface: `deno task catalog providers | endpoints [--provider]
    [--category] | categories | inspect <id>` (thin wrapper over core's
    catalog readers + the `.output/` cache); `deno task engine:run <id>
    --body/--query-params/--path-params` and `deno task record <id>
    <scenario>` with the same three flags (the fixture recorder: live call
    through the engine with a wrapped fetch, {req,res} pairs captured with
    headers DROPPED). AMENDED (post-review): the `--input` full-RunInput
    escape hatch was REMOVED — a second encoding plus a precedence rule is
    the same dual-encoding smell LoadFilter shed (D28-era round 7); flags
    are exactly zRunInput's fields in CLI kebab-case (cliffy maps
    --query-params → options.queryParams verbatim; kebab is the universal
    CLI convention, so a literal --queryParams flag was rejected).
- Consequences: the def surface carries nothing unconsumed; every field's
  reader is nameable.

## Concepts Reference

The vocabulary of the system — every term is defined here before it is used
in specs or code. (Process rule: nothing is built without being named,
defined, and justified in this file first.)

**Hooks, plainly** (the freshman primer): a compiled doc is a recipe card of
pure data. Five steps of calling an API genuinely need code — tweak the
input (`input.toRequest`), count what to bill (`usage.compute`), absorb the
vendor's billing fields into that structured usage (`usage.consolidate`),
tidy the response (`output.fromResponse`), inject the key (`auth.inject`).
These five doc fields are the HOOKS — the only places code may appear; a
function anywhere else is rejected. Each hook has a CONTRACT: one exact plug
shape (`{data, utils}` in, one exact type out — a wall socket that fits one
plug), enforced three times: at write time (TypeScript), at compile time
(zod), and on EVERY run (the engine re-validates input and output — a bad
plug stops the run with `FN_CONTRACT` instead of producing a garbage request
or a wrong bill). In the compiled doc a hook holds a fingerprint (`sha256:…`
fn id), not code — the code lives once in the fnTable, verified against the
fingerprint before rebuild.

| Term | Definition |
| --- | --- |
| **Def** (`EndpointDef`/`ProviderDef`) | Authoring shape: TypeScript with live zod schemas and typed fns. Input to the compiler, never executed in production. |
| **Doc** (`EndpointDoc`/`ProviderDoc`) | Compiled artifact: pure, flat, strict RFC 8259 JSON. Self-executing after provider fusion; fns appear only as `$fn` refs. |
| **Bundle** | One compilation output: `{catalogVersion, generatedAt, minEngineVersion, toolchain, providers, endpoints, taxonomy, fnTable}` — providers/endpoints are MAPS keyed by slug/id (uniqueness by construction). Cross-doc invariants enforced in `zBundle.superRefine`. |
| **Sealed unit** | `{doc, fns}` — one endpoint doc plus exactly the fn entries it references. NOT just a doc: the doc's slots hold hash references, not code; the sealed unit is the statically-linked binary to the doc's program-with-imports. The engine's load format. |
| **Hook** | One of the FOUR doc positions holding behavior: `input.toRequest`, `usage.consolidate`, `output.fromResponse`, `auth.inject`. ("Slot" is dead vocabulary.) |
| **Contract** | A hook's single definition: the zod `z.function({input:[zCtx], output})` factory (`InputToRequestContract`, … — one file per hook under `schema/hooks/`, beside its ctx data shape). Types the def, validates intake, and enforces every call via `.implement()`. |
| **FN_CONTRACT** | The error code for "a hook fn broke its contract": the engine validates each call's ctx before and the return after (via the contract's `.implement()`), and catches throws; any violation aborts the run fail-closed instead of continuing with a garbage request or wrong bill. Strict `utils.json` lookups throwing on a typo'd path surface here — never a silent zero bill. |
| **FnRef** (`{$fn: {key, args?}}`) | Content-hash reference from a doc slot into the fnTable. |
| **FnEntry** | fnTable row: `{api, kind: "fn"|"factory", src, provenance}`. `api` = the hook ABI floor (semver). `"fn"`: src IS the hook fn. `"factory"`: src RETURNS it when called with the ref's `args` — the closure split into code (stored once) + environment (data). |
| **Interning** / **fnTable** | The fnTable stores each DISTINCT function source exactly ONCE, keyed by its content hash (like git's blob store or string interning — hence the name). The compiler hashes normalized source and inserts only if new: byte-identical fns across endpoints POINT at one shared entry. The hash key doubles as the integrity check (`LINK_INTEGRITY`). |
| **Carrier** | The contract's stand-in inside object schemas — zod v4's `z.function()` is NOT a ZodType (cannot `.parse`, cannot sit in `z.strictObject`), so def fields hold a `z.custom` typed by the contract's fn type. Plumbing, not a second concept. `zSchemaCarrier` similarly holds live zod schemas. |
| **Preset** | Ready-made slot fn factory (`presets.transform.strip`, …) whose body uses only ctx + own params; interns as ONE parametric entry with per-use args as data. |
| **Fn id / doc hash** (`zFnId`/`zDocHash`) | Algorithm-agnostic content ids; the `sha256:` VALUE prefix is the migration mechanism (a future `blake3:` validates under the same interface). |
| **Normal form** / `normalizeFnSource` | Deterministic COMPACT fn source: TS parse → strip comments → AST print → scanner-join to ONE line (no newlines/indent; template/regex literal contents verbatim; parser-authority AST-equality gate). Layout-independent — the hashing input. |
| **`stableStringify`** | RFC 8785 (JCS) canonical JSON serialization — the doc/bundle hashing input. |
| **`parseSchema`** | The uniform zod parse wrapper (monid-services parser.ts pattern): typed value or `ValidationError` with a context label + sorted path→messages JSON. One error voice everywhere. |
| **ctx** (`{data, utils}`) | The single argument every hook fn receives: `data` = per-call validated JSON; `utils` = the host ABI (`json` + `money`). |
| **Host ABI** (`utils.json` + `utils.money`) | Engine-implemented primitives (engine/fn-utils.ts; interfaces in core) versioned by ENGINE_VERSION; never in the fnTable. JsonUtil lookups strict (absence throws; `optional*` opt in; mismatch always throws), transformers shape-tolerant; MoneyUtil converts to MonetaryValue. |
| **Fallback** | THE composition rule, leaf-wise, everywhere: endpoint ?? provider ?? config default. Includes hooks (endpoint hook REPLACES the provider's) and meta leaves (docsUrl/categories); headers merge key-wise. There is no chain semantics. Section fields are `.optional()`, never `.default()` — terminal defaults are applied by the compiler AFTER resolution (a parse-time default would shadow the other scope's explicit value). |
| **Fusion** | Compile-time push-down of provider-level config into each endpoint doc, making docs self-executing. |
| **Envelope** | The `{input, output}` data a post-response fn reads — `output` is the RAW decoded body for `usage.compute`, the decoded body for `fromResponse`. |
| **Sniffing decode** | The engine's universal body rule: JSON if it parses, else the faithful raw string. |
| **Usage** / **Measure** / **MonetaryValue** | Settlement result `{units: Measure[], cost?, evidence?}`. `units` = billable quantity in vendor-native units (`Measure = {amount, unit}` — what monid pricing multiplies); `cost` = the vendor's OWN reported price, READ from the response (never computed), as a monid-services `MonetaryValue` (`{currency, value: int, unit: MICRO_DOLLAR|CENT|DOLLAR}`, via `utils.money`). |
| **Evidence** | Audit receipts inside Usage — raw vendor values kept for invoices, not math. |
| **Injector** | The component that resolves credentials and executes `auth.inject` (directTransport locally, hosted Relay); the engine pipeline never sees secrets. |
| **Closed term** | Compiler lint: a fn's free identifiers are its own parameters plus whitelisted pure globals — no imports, no captured scope. |
| **Provenance** | Human breadcrumbs, never gates: fnTable `provenance` ("presets#…" or the def site) and `bundle.toolchain` ({compilerVersion, builtWithEngineVersion}). |
| **Contract config** | config.yml `schema:`+`compiler:` minus `logging:` subtrees — loaded override-free (no Deno.env) so bundle bytes are a pure function of repo content. |
| **ENGINE_VERSION** | engine/deno.json version — THE compatibility contract; docs gate on `minEngineVersion ≤` it, entries on `api ≤` it. |
| **RunResult / RunCompleted / RunRunning** | The run vocabulary's OUT-side (schema/run/result.ts): zod-first, flat, `kind`-discriminated. `start/poll` → RunResult; `run()` → RunCompleted. Symmetric with RunInput. "Tick" is dead vocabulary. |
| **Taxonomy** | Closed leaf-category vocabulary (`connectors/categories.ts`) + compiled membership map; TOP groups and visibility are hosted policy. |
| **Catalog (core)** | `shared/core/catalog.ts` — pure bundle readers: `listProviders`/`listCategories` spread the existing shapes + a count; `inspectEndpoint` returns the EndpointDoc ITSELF (it is the contract). Surfaced as `deno task catalog …` (cliffy CLIs). |
| **Consolidation** (`usage.consolidate`) | THE settle fn — RAW envelope → `{usage, output?}`: extracts the structured usage AND absorbs the billing fields out of the payload in one move (output absent = unchanged). REQUIRED; runs before fromResponse (billing truth anchors to the wire); engine-executed for every operator. |
| **Connector vs provider** | One string, two lenses: a CONNECTOR is the repo-side folder unit (`connectors/<name>/` — provider def + endpoints + fixtures); a PROVIDER is the vendor entity it describes, which compiled artifacts and the catalog talk about. The folder name IS `provider.name` (loader-asserted). |
| **load/** | @shared/core's IO corner: dynamic imports of authoring modules from disk (`loadConnectorDefs` walks the WHOLE connectors/ tree — no filters, D28 — and asserts folder == provider.name; `loadCategoryRegistry` imports the category registry). Called at compile time only (compileToOutput on cache miss, the test runner, the compiler golden). |

## D26 — Round 5: consolidation, money, hooks vocabulary, structural cleanups

- Context: the redact saga concluded (D21's removal stood for one round; review
  round 5 landed the final framing), and a batch of review questions exposed
  naming/structure debt.
- **`usage.consolidate`** (the redact question's final answer): a normal,
  ENGINE-EXECUTED pipeline step, identical for every operator — not hiding,
  CONSOLIDATION: billing info moves from loose vendor-specific payload fields
  into the ONE structured `usage` object that `usage.compute` just produced,
  so the same information doesn't appear twice in two shapes. It lives beside
  compute (same section), reads the same RAW envelope, and runs right after
  it, BEFORE fromResponse. exa: `presets.transform.strip(["costDollars"])` —
  costDollars leaves the output everywhere; `usage.cost` + `evidence` carry
  it in structured form. (Rejected on the way here: host-gated `usage.redact`
  — OSS-optics; data-only `redactKeys` — inflexible; Settlement merge into
  compute — muddied return; doc-declared/service-executed — the engine
  should just run it.)
- **Money**: `usage.cost` is a monid-services **`zMonetaryValue`**
  (`{currency, value: int ≥ 0, unit: MICRO_DOLLAR|CENT|DOLLAR}`, ported with
  zCurrency/zMonetaryUnit) — hosted settlement consumes it without
  translation. `units` stays `Measure[]` (3 results is not money);
  `Unit.USD` dropped. Hook fns are closed terms, so conversions live on the
  host ABI: `utils.money.fromDollars/fromMicroDollars` (engine/fn-utils.ts).
  Deprecated `.finite()` removed (zod v4 numbers already reject NaN/±Inf).
- **"Slot" died — they are HOOKS with one CONTRACT each**: the five
  fn-bearing doc fields (`input.toRequest`, `usage.compute`,
  `usage.consolidate`, `output.fromResponse`, `auth.inject`) are hooks; each
  is defined ONCE by its contract — the zod `z.function({input, output})`
  factory (`InputToRequestContract`, …, folder `schema/hooks/`, one file per
  hook with its ctx data shape). The CARRIER (`zXxxFn`) is not a second
  concept, just plumbing: zod v4's `z.function()` is not a ZodType (cannot
  `.parse`, cannot sit in an object schema), so the def field holds a
  `z.custom` stand-in typed by the contract's fn type.
- **fnTable `kind: "parametric"` → `"factory"`** ("parametric" is not a
  well-known term; "factory" is): `"fn"` entries' src IS the hook fn;
  `"factory"` entries' src RETURNS it when called with the ref's `args` —
  the closure split into its serializable halves (code stored once,
  environment as data; JS cannot serialize a closure's environment).
  Considered and REJECTED: application-form baking
  (`(<factory>)("x-api-key")` as a closed source — safe since ES2019 made
  JSON valid JS syntax) — it deletes `kind` but mints one entry per
  arg-combination and loses the factory-level sharing that keeps bundles
  small.
- **Algorithm-agnostic ids**: `zSha256Key` → `zFnId` (fnTable keys, $fn.key)
  + `zDocHash` (doc hashes). The `sha256:` prefix in the VALUE is the
  migration mechanism (a future `blake3:` validates under the same
  interface).
- **ProviderDoc slimmed** to `{specVersion, name, minEngineVersion, meta,
  hash}`: the endpoint index dropped (derivable — select on `doc.provider`;
  uncheckd denormalization could drift) and the credentials copy dropped
  (every EndpointDoc carries the fused `auth.credentials`; a provider-level
  copy goes stale on endpoint override).
- **Provider `slug` → `name`** (endpoints already used `name` for the folder
  — same concept, one word), and **ConnectorSource lost its folder field**:
  folder identity is a LOADER fact — `loadConnectorDefs` asserts
  folder == `provider.name` (the one place seeing both the filesystem and
  the def); the compiler, a pure mapping, keys everything off
  `provider.name` and never touches folder names. "Connector" survives as
  the glossary term for the repo-side folder unit; "provider" is the vendor
  entity in compiled artifacts.
- **`zTimeoutsSeed` → `zTimeoutsSection`** ("Seed" is reserved for the
  z.input def types; this is just the shared section shape).
- **config.yml**: `doc_format_since` + `fn_abi_since` moved `compiler:` →
  `schema:` (they describe the FORMAT/ABI, not compiler behavior; each is a
  DECLARED historical fact — "the oldest engine that understands X" — not
  derivable: using the current engine version would over-pin every doc).
  `cli:` renamed `scripts:` (settings for the repo's own command scripts).
- **Engine structure**: `engine/interfaces/mod.ts` defines the PUBLIC
  interface (ConnectorEngine, RunnableEndpoint, EngineCtx, Completed, Tick,
  Transport, PreparedRequest, ParamsResolver — monid-services interfaces/
  pattern; hosts code against these, not the classes).
  `engine/json-util.ts` → **`engine/fn-utils.ts`**: the ONE implementation
  site for all of `ctx.utils` (json + money) — the twin-filename confusion
  with core's `schema/json/util.ts` (the INTERFACE) is resolved by making
  the interface/impl split explicit. `link.ts` stays in the engine
  deliberately: its gates are engine load-time guarantees tied to
  ENGINE_VERSION, and it calls `new Function` — an execution capability the
  contract package must never have. `resolve()` carries origin labels solely
  to keep `FnEntry.provenance` truthful (a provider-authored fn must be
  blamed on provider.ts, not the first endpoint that used it).
- **Catalog readers simplified**: `inspectEndpoint` returns the EndpointDoc
  ITSELF (it is the contract — no projection, no undefined-spread
  ceremony); `listCategories` = `{...leaf, endpointCount}`; `listProviders`
  = `{...meta, name, endpointCount}`. Scripts moved to **@cliffy/command**
  (subcommands, typed flags, generated --help).
- Consequences: one less concept ("slot"), one more executed hook, money in
  hosted-native form, and every review question from rounds 4–5 has a
  written answer here.

## D27 — Round 6: compute merged into `usage.consolidate` — one settle fn

- Context: after round 5, `usage.compute` and `usage.consolidate` were two
  fns sharing one piece of knowledge (where the vendor's billing info
  lives), and consolidate still read as "redact work" bolted beside compute.
- Decision: ONE required hook — **`usage.consolidate: (raw envelope) →
  {usage: Usage, output?: Json}`** — the SETTLE fn. One total job with two
  halves of a single move (like a parser returning `{value, rest}`): EXTRACT
  the structured usage and ABSORB the billing fields out of the payload.
  `output` ABSENT means "unchanged" — `presets.usage.perCall()/perResult`
  return `{usage}` only, so endpoints with nothing to remove write zero
  boilerplate. Hooks are FOUR: toRequest, consolidate, fromResponse,
  auth.inject.
  - This is NOT the earlier-rejected Settlement merge: that shape bolted an
    optional `redacted` payload onto the Usage RECORD; this is a proper
    pair return validated as `zConsolidated` (FN_CONTRACT covers both
    halves).
  - **Ordering — BEFORE fromResponse, firmly**: billing truth must anchor to
    the RAW wire response — fromResponse reshapes/filters and could
    otherwise silently change a bill; facts (settlement) before presentation;
    fromResponse authors get a cleaned, domain-only input. Billing on the
    post-transform shape is exactly the fragile coupling this forbids.
  - **Why `usage.consolidate`, not `output.consolidateUsage`**: the fn's
    PRIMARY product is the required Usage record ("every endpoint must
    settle"); housing it under the otherwise-optional, presentational
    `output:` section would bury the billing responsibility and couple the
    billing fallback to the presentation fallback. Sections group by
    RESPONSIBILITY, not field count.
  - **fromResponse does NOT receive `usage`** (considered): the engine
    result already returns usage beside output — embedding it in the payload
    would reintroduce the same-information-in-two-shapes duplication that
    consolidation removes; additive later (widen the envelope in a minor)
    if a real connector needs it.
- Consequences: the where-billing-lives knowledge appears exactly once; one
  hook fewer; slightly coarser FN_CONTRACT attribution (one fn — the zod
  path still pinpoints the usage-vs-output half).

## D28 — Round 8: compile everything, look up in the bundle (filters removed)

- Context: `LoadFilter`/`--provider`/`--endpoint` let the CLI compile partial
  bundles. Review asked the right question: why look anything up at LOAD
  time when the compiled bundle already answers it?
- Decision: **compilation is always WHOLE-REPO → one cached artifact
  (`.output/catalog.json`); every provider/endpoint lookup reads the
  COMPILED bundle** (`sealUnit(bundle, id)`, the catalog readers).
  `loadConnectorDefs(connectorsDir)` takes no filter; `compileToOutput()`
  takes no selector; `compiler:compile` lost its selector flags.
  - The filter was dead weight: the cache key hashes EVERY source regardless
    of selection, so partial compiles never saved a recompile — they only
    multiplied `.output/` artifacts; and partial bundles were second-class
    shapes (subset taxonomy, subset minEngineVersion) masquerading as the
    real thing.
  - JIT is unaffected: `engine:run` still compiles on demand — JIT motivated
    the CACHE, not the filter; a whole-repo compile behind the same cache
    key serves it identically.
  - Accepted trade-off: a broken def anywhere fails the whole compile —
    fine (the repo must stay green; CI compiles everything anyway). If
    compile time ever hurts at scale, per-provider caching returns INSIDE
    the compiler as an optimization, never as a user-facing filter.
  - `parseEndpointId` survives only where the id's halves matter separately
    (record's fixture path); unknown ids now surface at bundle-lookup time
    ("endpoint not in bundle"), not load time.
- Consequences: one artifact, one cache key, one lookup story; LoadFilter
  and its "endpoint requires provider" rule (round 7) deleted a round later —
  the better fix was removing the choice entirely.

## D29 — Round 9: run results = zod-first `Run*` family (monid-services lifecycle style)

- Context: `Tick`/`Completed` were bare TS types (violating our own D15
  zod-first rule for shapes that cross Temporal activity boundaries by
  value), with an opaque name and a nested `{status, result}` unwrap.
  Review asked for prefixed names and a comparison with monid-services'
  `lifecycleResults.ts`.
- Decision: `shared/core/schema/run/` now holds the RUN vocabulary —
  `zRunInput` (moved from common/http.ts) in, `zRunResult` out:
  `zRunCompleted {kind: "completed", httpStatus, output, usage,
  isProviderError}` | `zRunRunning {kind: "running", state, pollAfterMs}`
  (reserved), `zRunResult = discriminatedUnion("kind", …)`. `start/poll`
  return RunResult; `run()` returns RunCompleted directly (its `kind` rides
  along; no nesting). Engine interfaces re-export the types.
- ADOPTED from monid-services lifecycleResults: prefixed per-variant names
  (RunStartCompleted-style), zod-first `kind`-discriminated unions, FLAT
  variants. NOT adopted, deliberately: the `httpStatus`/`providerHttpStatus`
  OURS/THEIRS pair (arrives together with doc-level in-body error detection
  — `isProviderError` IS today's classification), the `actualCost`-on-error
  exception channel (v2 usage is settled by the doc's consolidate; vendor
  error ⇒ zero usage is policy), the `metadata` bag (YAGNI), and
  `stop.unresolved`/`providerRunId` (async is reserved — when it lands, this
  splits into per-phase `RunStartResult`/`RunPollResult` using the
  derived-variant trick, e.g. poll's running = start's minus providerRunId,
  so shapes cannot drift).
- Consequences: run shapes are validatable at every process boundary; call
  sites read `RunCompleted` and know what they hold; the async change has a
  written evolution path.
