# Add schema refinement hooks (input + output)

## Why

v1 adaptors enforced cross-field input rules with zod
`.refine()`/`.superRefine()` — tinyfish's recency-vs-date exclusions,
fundable's exactly-one-identifier rules, pdl's enrich identifier
combinations, minimax's mode×field intersections, bytedance's frame-pairing
rules, ploid's provide-X-or-Y reads, suzanne's per-model shapes, surf's
identifier alternatives. v2 compiles input schemas to inert JSON Schema
(`z.toJSONSchema`), and a refinement is an arbitrary closure with no JSON
Schema representation — it is SILENTLY DROPPED at compile. Today those
rules are describe-text: an input v1 rejected with a free pre-flight 400
now travels to the vendor and comes back as a vendor 400 (error-as-data,
$0) — or silently succeeds (v1 noted some fundable double-identifier calls
are NOT rejected upstream), or burns shared rate-limit budget (tinyfish's
per-key budget is workspace-wide).

The 2026-09-16 reconcile inventoried every dropped rule (reconcile-report
§4.5) and mitigated the expressible ones (regex patterns, anyOf unions,
`meta.notes`) — but the genuinely cross-field rules need a lawful home in
the compiled artifact.

## What changes

- A tenth hook family: PURE `input.refine` and `output.refine` — closed-term
  fns compiled into the fnTable exactly like every other hook, emitted in
  the doc as `zFnRef` lists sitting BESIDE the compiled JSON Schema they
  guard (`input.refine[]`, `output.refine[]`).
- Authoring: refinements are written ON the zod schema itself — plain
  `.refine()`/`.superRefine()`, v1 muscle memory — and the COMPILER harvests
  them from the schema's checks list (`schema._zod.def.checks[]`), running
  each closure through the same closed-term normalization/lint/interning as
  hook fns. The link back to the zod is intrinsic: the fn was lifted off
  that schema at that location. (Fallback design if harvesting zod
  internals proves brittle across zod versions: explicit sibling slots
  `input: { schema, refine }` / `output: { schema, refine }`.)
- Engine: input refinements run AFTER JSON-Schema validation and BEFORE
  `input.toRequest`, raising INVALID_INPUT (free, pre-flight). Output
  refinements run AFTER `output.fromResponse` and are REPORT-ONLY (surfaced
  like the mismatch signal) — output validation can never fail a paid run.
- Closed-term rules apply to refinement closures (no captures — TS-AST
  linted); a capturing refinement is a compile error telling the author to
  inline the constant.
- ENGINE_VERSION minor bump + `fn_abi_since`/`doc_format_since` facts; the
  new contract files join CONTRACT_PATHS.
- Then: port the full reconcile §4.5 rule inventory by restoring the v1
  refinement text onto the v2 schema files.

## Non-goals

- Transforms (`.trim()`, `.default()` inside refinements) — refinements
  VALIDATE, they never rewrite the value; transform semantics stay a D25
  binding concern.
- Replacing JSON Schema: the structural contract remains `z.toJSONSchema`;
  refinements are the cross-field remainder only. A rule expressible as a
  pattern/enum/anyOf belongs in the schema, not a refinement (the reconcile
  already moved those).

## Impact

- Affected specs: connector-schema, connector-compiler, connector-engine.
- Affected code: shared/core/schema/hooks/, shared/core/schema/endpoint/
  {def,doc,define}.ts, shared/compiler/{compile,fns,lint}.ts,
  engine/{engine,link}.ts, scripts/version-check.ts (CONTRACT_PATHS),
  config.yml version facts — then per-connector schema files for the rule
  ports.
