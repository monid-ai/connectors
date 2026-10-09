# connector-compiler (delta)

## ADDED Requirements

### Requirement: Resources compile like endpoints
The compiler SHALL discover `resources/<name>/resource.ts` per provider,
infer the id `<provider>/<name>`, fuse provider auth/request origin, intern
every fn (ops, externals, getActualCost, webhook fns, binding seed/ensure)
into the shared fnTable with the `schema.resources_since` ABI stamp where
the resource family is the surface, and emit `zResourceDoc` into the
bundle's `resources` map with both-direction closure enforced.

#### Scenario: Determinism holds
- **WHEN** the repo compiles twice with frozen meta
- **THEN** the bundles are byte-identical, resources included

### Requirement: Binding derivation and coherence
The compiler SHALL resolve every entry of the endpoint's purpose-keyed
`resources:` arrays (provisions / uses / updates / releases / reads)
against the bundle's resources (unknown id → CompileError), verify
per-purpose coherence (updates/releases entries require `key`; provisions
carry `seed` and at most ONE entry; `ensure` rides uses/reads only;
aliases unique across purposes), verify input-superset contracts against
the resource's `inputs` slot per purpose — required NAMES present AND
shape-compatible (declared scalar `type` match; one-level nested
`required`) — and reject dead keys (a JSONPath no declared input can
carry).

#### Scenario: Missing release input contract
- **WHEN** an endpoint binds RELEASES but its input cannot accept the
  resource's `inputs.release` schema
- **THEN** compilation fails naming both schemas

### Requirement: Billing coherence
The compiler SHALL enforce: `variable` ⇒ rent present AND `ops.release`
present; `holdCadenceMs ≥ 3_600_000`; `usage.accrue` ⇒ lifecycle.poll
resolves; accrue counts keys ⊆ the model's metered keys.

#### Scenario: Sub-hour cadence rejected
- **WHEN** a def declares `holdCadenceMs: 60_000`
- **THEN** compilation fails (host workflow-history floor)

### Requirement: Versioning facts
`doc_format_since` and `fn_abi_since` SHALL stay put (nothing
pre-existing changed shape; pure-hook docs gain no capability). EVERY
resource-family surface — resource docs, binding-carrying endpoint docs,
resource/webhook fn entries' `api`, and the estimate cadence — SHALL
stamp `schema.resources_since`. `deno task version:check` SHALL gate the
ENGINE_VERSION minor bump.

#### Scenario: Old connectors keep their floor
- **WHEN** a sync connector without bindings recompiles after this change
- **THEN** its docs are byte-identical, `minEngineVersion` unchanged
