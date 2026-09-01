# connector-compiler (delta)

## ADDED Requirements

### Requirement: Pure mapping keyed off provider.name
The compiler SHALL be the pure mapping `(ConnectorSource[], options) → Bundle`
(def-tree loading AND the folder==name assertion live in
`@shared/core/load/`). It SHALL key everything off `provider.name` — it
never sees folder names — and infer each endpoint `id` as
`<providerName>#<endpointName>`. Emitted maps SHALL be keyed by identity
(uniqueness by construction).

#### Scenario: Invalid provider def
- **WHEN** a ConnectorSource carries a malformed provider def
- **THEN** intake fails with the uniform parseSchema error

### Requirement: Provider fusion — leaf-wise fallback, closest wins
The compiler SHALL fuse the provider's flat sections into each endpoint doc
with ONE rule — endpoint ?? provider ?? config default, per leaf:
`request.baseUrl` (resolved with `request.path` into the absolute `url`;
neither = compile error), headers (key-wise merge, endpoint key wins),
timeouts (field-wise), `auth.inject`, `auth.credentials` (?? the default
apiKey shape), `usage.compute`, `input.toRequest`, `output.fromResponse`, and the endpoint's own settle fn
(the endpoint hook REPLACES the provider's — single `$fn` ref in the doc),
input/output schemas, and the meta leaves `docsUrl`/`categories`. Provider
`meta` SHALL NOT otherwise be copied into endpoints; the ProviderDoc SHALL be
extracted after push-down (identity + display only — see connector-schema).

#### Scenario: Endpoint has no server info
- **WHEN** an endpoint declares no `baseUrl` and its provider has no
  `request.baseUrl`
- **THEN** compilation fails naming the endpoint and both fix sites

#### Scenario: Both declare a hook
- **WHEN** provider and endpoint both declare `output.fromResponse`
- **THEN** the doc references ONLY the endpoint's fn (fallback, not chain)

### Requirement: Completeness check after merge
After fallback the compiler SHALL verify each doc can execute and settle:
absolute `url`, `auth.inject`, and `usage.consolidate` MUST have resolved —
a missing one SHALL fail compilation with an error naming the endpoint and
both places to fix (endpoint or provider), pointing at
`presets.usage.perCall()` for flat billing.

#### Scenario: No settle fn anywhere
- **WHEN** neither the endpoint nor its provider declares `usage.consolidate`
- **THEN** compilation fails naming the endpoint

#### Scenario: No inject anywhere
- **WHEN** neither the endpoint nor its provider declares `auth.inject`
- **THEN** compilation fails naming the endpoint

### Requirement: Fn extraction, normalization, interning
For every resolved fn slot the compiler SHALL: capture the source, normalize
it (`normalizeFnSource` — deterministic formatting, comments stripped), lint
it as a closed term (free identifiers beyond own parameters are errors),
compute `key = sha256(normalized src)`, intern the entry (identical source ⇒
one entry), stamp `api = fn_abi_since` (config.yml `schema:` section), and
replace the hook with `{"$fn": {key, args?}}`. Preset applications SHALL hash
the FACTORY source once (entry kind "factory", provenance `presets#<name>`)
with call arguments serialized as `args`. Provenance SHALL name the def site
the fn was resolved FROM (endpoint or provider file — the reason the
fallback resolver carries origin labels). Provider fns SHALL be interned
only when some endpoint resolves to them (no orphan entries).

#### Scenario: Shared fn across endpoints
- **WHEN** two endpoints author byte-identical (post-normalization) fns
- **THEN** the bundle contains exactly one fnTable entry referenced by both docs

#### Scenario: Closure capture
- **WHEN** a fn references a variable from its enclosing module scope
- **THEN** compilation fails with a closed-term error

### Requirement: minEngineVersion derivation (auto-only)
Each doc's `minEngineVersion` SHALL be
`semverMax(doc_format_since, api of every referenced fn entry)` — computed by
the compiler, never authorable. The bundle's `minEngineVersion` SHALL be the
max over all docs.

#### Scenario: All current fns
- **WHEN** every referenced entry carries the current `fn_abi_since`
- **THEN** the doc's minEngineVersion equals
  `semverMax(doc_format_since, fn_abi_since)`

### Requirement: Bundle assembly, closure and validation
The compiler SHALL emit a bundle whose `fnTable` is exactly the closure of all
`$fn` keys (no orphans, no misses — enforced again by `zBundle.superRefine`),
parse every emitted doc through `parseSchema` against its zod schema, enforce
`fn_src_max_bytes` and doc-size lints from config.yml, and compute RFC 8785
canonical hashes.

#### Scenario: Orphan table entry
- **WHEN** the assembled fnTable contains a key no doc references
- **THEN** compilation fails the closure check

### Requirement: Deterministic output and cache
Compilation SHALL be deterministic: identical inputs + toolchain versions ⇒
byte-identical output. Because filesystem enumeration order is
platform-dependent and iteration order decides fnTable insertion (first
occurrence wins provenance), the compiler SHALL iterate providers and
endpoints in sorted order — documented at the sort site. Output SHALL be
written under gitignored `.output/`, cache-keyed by `sha256(inputs) +
engine/compiler versions`; `catalogVersion`/`generatedAt` metadata SHALL not
participate in the determinism comparison (pinned by `--frozen-meta`).

#### Scenario: Double compile
- **WHEN** the same tree is compiled twice with `--frozen-meta`
- **THEN** the two bundles are byte-identical

### Requirement: Whole-repo compilation, bundle-side lookup
Compilation SHALL always cover the whole connectors tree, producing ONE
artifact (`.output/catalog.json`) behind one cache key — there SHALL be no
partial-compile selectors. Provider/endpoint lookups SHALL read the COMPILED
bundle (`sealUnit(bundle, id)`, the catalog readers), never re-load defs.

#### Scenario: Unknown endpoint surfaces at lookup
- **WHEN** a caller asks for `ghost#search`
- **THEN** the error comes from the bundle lookup ("endpoint not in
  bundle"), after a normal whole-repo compile

### Requirement: Compact normalization via the TypeScript compiler API
Fn-source normalization SHALL be performed in-process with the TypeScript
compiler API — parse, print with comments removed, then COMPACT the printed
output to a single line by re-tokenizing with the TypeScript scanner
(template substitutions and regex literals re-scanned; string/template token
text verbatim; a space only where token concatenation would merge). The
result SHALL contain no newlines or indentation outside literal contents,
and SHALL be layout-independent: comment, formatting, indentation, and
line-break edits never change a fn's id. A parser-authority safety gate
SHALL re-parse the compacted source and require structural AST equality with
the printed form, failing compilation on any drift.

#### Scenario: Cosmetic edit
- **WHEN** a fn gains a comment, is re-wrapped, re-indented, or switches
  single-line ↔ multi-line layout
- **THEN** its normalized source and fn id are unchanged

#### Scenario: Literal contents are not layout
- **WHEN** a fn contains a template literal with an embedded newline or a
  regex with internal spaces
- **THEN** those bytes survive normalization verbatim

### Requirement: Closed category vocabulary
`meta.categories` values (post-fallback) SHALL be validated fail-closed
against the leaf registry (connectors/categories.ts); an unknown id fails
compilation. The compiler SHALL aggregate `bundle.taxonomy` = the full leaf
registry plus membership (leafId → sorted endpoint ids).

#### Scenario: Unknown leaf
- **WHEN** an endpoint declares a category id absent from the registry
- **THEN** compilation fails naming the id and the registry file

### Requirement: Toolchain provenance stamping
The compiler SHALL stamp `bundle.toolchain = {compilerVersion,
builtWithEngineVersion}`. Consumers SHALL treat it as provenance only — the
engine never gates on compiler version.

#### Scenario: Old compiler, valid bundle
- **WHEN** a bundle built by an older compiler satisfies minEngineVersion/specVersion
- **THEN** the engine loads it normally
