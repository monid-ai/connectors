# connector-schema (delta)

The contract package is `@shared/core`, laid out by kind of content:
`schema/` (zod contract shapes, incl. `hooks/` — one file per hook),
`presets/` (behavior), `load/` (IO), `catalog.ts` (pure bundle readers) —
see design D23/D26.

## ADDED Requirements

### Requirement: Strict Json runtime type
All compiled artifacts and runtime IO SHALL be strict RFC 8259 JSON (null, boolean,
finite number, string, array, object). `undefined`, functions, dates, and live schemas
SHALL NOT appear in Docs, sealed units, results, or fixtures; `undefined` is expressed
as key absence. The `zJson` schema SHALL be zod v4's built-in `z.json()` pinned to the
package's `Json` alias.

#### Scenario: Doc round-trips through JSON
- **WHEN** any compiled doc is `JSON.parse(JSON.stringify(doc))`-round-tripped
- **THEN** the result deep-equals the original

#### Scenario: Non-finite numbers rejected
- **WHEN** `zJson` parses `Infinity` or `NaN`
- **THEN** parsing fails

### Requirement: Shared def sections with leaf-wise fallback
EndpointDef and ProviderDef SHALL use the SAME section schemas
(`schema/sections/`): `input {schema?, toRequest?}`, `output {fromResponse?,
schema?}`, `usage {consolidate?}`, `auth {inject?, credentials?}`,
`timeouts` (`zTimeoutsSection` — "Seed" is reserved for z.input def types),
and `request` (provider subset `{baseUrl?, headers?}`; endpoint adds required
`method` + `path` starting with `/`). Every section SHALL be optional on both
sides; the provider SHALL carry its sections FLAT and be identified by
`name` (matching the endpoint folder convention — no `slug`). Resolution
SHALL be leaf-wise, closest wins: endpoint ?? provider ?? config default —
including hooks (an endpoint hook REPLACES the provider's) and the meta
leaves `docsUrl` and `categories`. Headers SHALL merge key-wise with the
endpoint key winning.

#### Scenario: Minimal endpoint def
- **WHEN** an endpoint declares only meta, request, and input.schema
- **THEN** auth, usage, timeouts, and baseUrl resolve from the provider (or
  config defaults) and the def parses

#### Scenario: Endpoint hook replaces provider hook
- **WHEN** both provider and endpoint declare `output.fromResponse`
- **THEN** the compiled doc references ONLY the endpoint's fn

#### Scenario: Parse-time defaults never shadow the other scope
- **WHEN** an endpoint overrides only `auth.inject` and its provider
  declares explicit `auth.credentials`
- **THEN** the compiled doc carries the PROVIDER's credential shape — the
  default applies only when NEITHER scope declares one (section fields are
  `.optional()`, never `.default()`; terminal defaults are compiler-applied
  after fallback)

#### Scenario: minEngineVersion is not authorable
- **WHEN** a def author attempts to set `minEngineVersion`
- **THEN** def parsing rejects it (strict schema) — the floor is compiler-computed only

### Requirement: Four hooks, one contract each
The ONLY fn-bearing positions SHALL be the four HOOKS: `input.toRequest`,
`usage.consolidate`, `output.fromResponse`, and `auth.inject`. Every hook fn SHALL take ONE argument `ctx = { data, utils }`
where `data` is hook-specific pure JSON and `utils` carries host capabilities
(`utils.json: JsonUtil`, `utils.money: MoneyUtil`). Each hook SHALL be
defined once by its CONTRACT — a zod v4 `z.function({input: [zCtx], output})`
factory (`InputToRequestContract`, …) in its own file under `schema/hooks/`,
beside its ctx data shape — serving author typing, compiler validation, and
engine call-time enforcement via `.implement()`. Def fields SHALL hold
CARRIERS (`z.custom` typed by the contract's fn type) because zod v4's
`z.function()` is not a ZodType and cannot sit inside object schemas.

#### Scenario: Fn outside a designated hook
- **WHEN** a def contains a function value anywhere else
- **THEN** def parsing fails (strict schemas — the placement lint is structural)

### Requirement: Usage model — measures, monetary cost, evidence, consolidation
The package SHALL define `Unit` as a const object (`CALL`, `RESULT`, `TOKEN`,
`CHARACTER`, `SECOND`, `MINUTE`, `CREDIT`; append-only; no `USD` — cost is
monetary), `zMeasure = {amount: number >= 0, unit: Unit}`, the monid-services
monetary primitives (`zMonetaryValue = {currency, value: int >= 0, unit:
MICRO_DOLLAR|CENT|DOLLAR}`, `zCurrency`, `zMonetaryUnit`), and
`zUsage = {units: Measure[] (min 1), cost?: MonetaryValue, evidence?:
Record<string, Json>}`. ONE settle fn — `usage.consolidate: (raw envelope) →
zConsolidated = {usage: zUsage, output?: Json}` — SHALL both extract the
structured usage AND return the output with the vendor billing fields
ABSORBED (output absent = unchanged); engine-executed, identical for every
operator (consolidation, not hiding: cost/evidence keep the information in
one shape).

#### Scenario: Settle-pair validation
- **WHEN** a `usage.consolidate` result fails `zConsolidated` on EITHER half
  (bad usage record or non-Json output)
- **THEN** the engine fails with `FN_CONTRACT`

#### Scenario: Monetary cost
- **WHEN** consolidate reads exa's `costDollars.total` of 0.005 via
  `utils.money.fromDollars`
- **THEN** `usage.cost` is `{currency: "USD", value: 5000, unit: "MICRO_DOLLAR"}`

### Requirement: Host ABI — JsonUtil strictness + MoneyUtil
`ctx.utils` SHALL comprise `json: JsonUtil` (strict lookups `get`/`num`/`len`
that THROW on absence; `optionalGet`/`optionalNum`/`optionalLen` returning
undefined on absence; type mismatch and invalid path syntax ALWAYS throwing;
shape-tolerant `omit`/`pick`/`merge`) and `money: MoneyUtil`
(`fromDollars`/`fromMicroDollars` → MonetaryValue). Interfaces SHALL live in
the contract package; implementations are engine-owned (engine/fn-utils.ts),
versioned by ENGINE_VERSION, NEVER in the fnTable. Presets SHALL be
namespaced under `presets.*` and SHALL be fnTable content ("factory"
entries), with bodies referencing only ctx and their own parameters.

#### Scenario: Typo'd path never bills zero
- **WHEN** `usage.consolidate` calls `utils.json.len(output, "$.typo")`
- **THEN** the lookup throws and the run fails with `FN_CONTRACT` (instead of
  settling at 0 units)

#### Scenario: Optional means absent, never garbage
- **WHEN** `optionalNum` addresses a present non-numeric value
- **THEN** it throws (only true absence returns undefined)

### Requirement: Meta with defined roles
`zBaseMeta` SHALL comprise `displayName`, `summary` (ONE line, for list
views), optional `description` (a single string of full capability text, for
inspect views and agent consumption), and optional `docsUrl`. There SHALL be
no `tags` and no `deprecated` field. `zEndpointMeta` adds optional
`categories`; `zProviderMeta` adds optional `homepageUrl` and `categories`.

#### Scenario: Endpoint inherits provider docs
- **WHEN** an endpoint declares no `docsUrl` or `categories`
- **THEN** the compiled doc carries the provider's values for both

### Requirement: Connector zod schema layout
Endpoint-local zod schemas SHALL live at `endpoints/<name>/schema/inputs.ts`
(later `outputs.ts`); provider-shared zod SHALL live at
`connectors/<name>/schema/<topic>.ts`. Schemas SHALL never be imported across
providers.

#### Scenario: Shared options within a provider
- **WHEN** two endpoints of one provider reuse an options block
- **THEN** it is defined once under `connectors/<name>/schema/` and imported by
  both endpoint schema files

### Requirement: EndpointDoc compiled shape
`zEndpointDoc` SHALL comprise: `specVersion` (semver literal from config.yml
`schema.spec_version`), `id` (`<providerName>#<endpointName>`, inferred,
never authored), `provider`, `minEngineVersion` (semver, compiler-computed),
`meta` (post-fallback), `auth` (`{inject: $fn, credentials: JSON Schema}` —
credential SHAPE, never values), `request` (`method`, absolute `url` after
baseUrl resolution, optional `headers`), `input`
(`schema.{body,queryParams,pathParams}` JSON Schemas + optional
`toRequest: $fn`), `output` (optional `fromResponse: $fn` + optional
`schema`), `usage` (`consolidate: $fn` REQUIRED),
`timeouts`, and `hash` (`zDocHash`).

#### Scenario: $fn only in Docs
- **WHEN** an author writes a literal `{"$fn": …}` value in a def
- **THEN** compilation rejects it (reserved marker)

### Requirement: ProviderDoc is identity + display only
`zProviderDoc` SHALL comprise exactly `specVersion`, `name`,
`minEngineVersion` (max over its endpoints), `meta`, and `hash` — no
endpoint index (derivable by selecting on `endpointDoc.provider`) and no
credentials copy (every EndpointDoc carries the fused `auth.credentials`).

#### Scenario: Endpoints of a provider
- **WHEN** a consumer wants provider X's endpoints
- **THEN** it filters `bundle.endpoints` on `doc.provider` (the catalog's
  `listEndpoints(bundle, {provider})` does exactly this)

### Requirement: Bundle as identity-keyed maps; sealed unit; fnTable kinds
`zBundle` SHALL comprise `catalogVersion`, `generatedAt`, `minEngineVersion`,
`toolchain` (provenance, never a gate), `providers` (MAP name → ProviderDoc),
`endpoints` (MAP id → EndpointDoc), `taxonomy`, and `fnTable` (MAP
`zFnId` → `{api, kind: "fn"|"factory", src, provenance}`): a `"fn"` entry's
src IS the hook fn; a `"factory"` entry's src RETURNS it when called with the
ref's `args` (the closure split into serializable code + environment; one
stored factory serves every arg combination). `zBundle.superRefine` SHALL
enforce map key == doc identity, fnTable closure in BOTH directions, and
taxonomy membership referencing real endpoints. `zSealedUnit` SHALL be
`{doc, fns}` with exactly the entries the doc references — used by
`Engine.load`, the test runner, the record script, and (later) the hosted
worker's Temporal payloads.

#### Scenario: Sealed unit is self-contained
- **WHEN** a sealed unit is serialized and moved to another process
- **THEN** an engine there can execute it with no other data

#### Scenario: Factory sharing
- **WHEN** two connectors apply `presets.auth.header` with different header
  names
- **THEN** the bundle contains ONE factory entry, referenced with different
  `$fn.args`

### Requirement: Uniform zod parsing
`@shared/core` SHALL provide `parseSchema(schema, input, context?)` (and
`createParser`), returning the typed value or throwing `ValidationError`
whose message is `<context>: {"<sorted.path>": ["message", …]}` — the
context label names WHICH instance failed, since one schema parses many.
Defines, compiler intake, config loading, and doc emission SHALL parse
through it; the engine MAY keep safeParse for error-code mapping but SHALL
format messages with the exported `formatZodError`.

#### Scenario: One error voice
- **WHEN** any def, doc, config, or bundle fails validation
- **THEN** the error message carries the context label and deterministic
  sorted path → messages JSON

### Requirement: Restricted JSONPath (RFC 9535 subset)
Envelope paths SHALL match the RFC 9535-compatible subset: `$` root, dot member
access, and non-negative numeric indexes only (no wildcards, filters, slices, or
recursive descent).

#### Scenario: Unsupported path construct
- **WHEN** a def uses a path containing `*`, `..`, or a filter
- **THEN** compilation fails with a path-grammar error

### Requirement: Canonical, algorithm-agnostic hashing
Doc and fn hashing SHALL use RFC 8785 (JCS) canonical JSON serialization
(`stableStringify`) with sha256, carried in ALGORITHM-AGNOSTIC id types:
`zFnId` (fnTable keys, `$fn.key`) and `zDocHash` (doc hashes) — the
`sha256:` value prefix is the migration mechanism for future algorithms. A
doc's `hash` SHALL cover its `$fn` ids and exclude only the `hash` field
itself.

#### Scenario: Cosmetic reorder does not change hash
- **WHEN** two semantically identical docs differ only in object key order
- **THEN** their hashes are equal

### Requirement: Contract configuration is override-free
`@shared/core` SHALL load contract constants from the top-level config.yml
`schema:` (spec version, JSON Schema dialect, fn source bound,
`doc_format_since`, `fn_abi_since` — the declared FORMAT/ABI facts) and
`compiler:` (doc size bounds, default timeouts) sections WITHOUT env-var or
stage overrides — bundle bytes are a pure function of repo content.
`logging:` subtrees, `engine:`, and `scripts:` SHALL be tooling configuration
(ignored by the contract loader, read via `@shared/app-config`).

#### Scenario: Env var cannot change contract values
- **WHEN** the contract loader is inspected
- **THEN** it contains no environment access (guarded by test)

### Requirement: Def-tree loading owns folder identity
`@shared/core/load/` SHALL provide `loadConnectorDefs(connectorsDir)` —
always the WHOLE tree, no filters (lookups happen in the compiled bundle) —
and `loadCategoryRegistry`. `ConnectorSource` SHALL be
`{provider, endpoints}` with NO folder field: the loader — the one place
seeing both the filesystem and the def — SHALL assert
folder == `provider.name` and fail loudly on mismatch. The compiler SHALL
NOT read the filesystem or folder names; the engine SHALL NOT import
authoring code.

#### Scenario: Folder/name mismatch
- **WHEN** `connectors/exa/provider.ts` declares `name: "other"`
- **THEN** loading fails naming both the folder and the def

#### Scenario: Lookups read the bundle, not the tree
- **WHEN** a caller wants one provider's endpoints or one endpoint's
  contract
- **THEN** it reads the compiled bundle (listEndpoints / sealUnit /
  inspectEndpoint) — loading is never re-run to answer a lookup

### Requirement: Bundle catalog read API in core
`@shared/core` SHALL provide pure, SIMPLE bundle readers:
`listProviders(bundle)` (provider meta + name + endpointCount),
`listEndpoints(bundle, {provider?, category?})`, `listCategories(bundle)`
(leaf + endpointCount), and `inspectEndpoint(bundle, id)` returning the
EndpointDoc ITSELF (the doc is the contract — no projection types).

#### Scenario: Inspect is the doc
- **WHEN** `inspectEndpoint(bundle, "exa#search")` is called
- **THEN** it returns `bundle.endpoints["exa#search"]` unchanged
