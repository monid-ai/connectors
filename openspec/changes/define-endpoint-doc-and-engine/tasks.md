# Tasks: define-endpoint-doc-and-engine

## 0. OpenSpec

- [x] 0.1 Change created: proposal, design (ADRs D1–D13), spec deltas, tasks

## 1. Scaffold

- [x] 1.1 Root deno.json: workspace ["./shared/*", "./engine", "./connectors"],
      @shared/* + @monid/connector-engine aliases, tasks (check/test/test:live/
      compiler:compile/engine:run/record/version:check), fmt/lint per monid-services
- [x] 1.2 .gitignore: .output/, .env; member deno.json files

## 2. @shared/schema

- [x] 2.1 json.ts: strict Json type + zJson + purity assert
- [x] 2.2 paths.ts: RFC 9535-subset grammar + getPath + envelope-path refinement
- [x] 2.3 canonical.ts: JCS-style canonicalize + sha256 helpers
- [x] 2.4 usage.ts: Unit const object, zUnit, zMeasure, zUsage
- [x] 2.5 def.ts: RunInput, Envelope, fn slot types (uniform (ctx, engine)), EndpointDef,
      ProviderDef, Meta
- [x] 2.6 doc.ts: zFnRef, zEndpointDoc, zProviderDoc, zResourceDoc (reserved),
      zFnEntry (FN_SRC_MAX), zBundle, zSealedUnit
- [x] 2.7 Tests: json purity, path grammar accept/reject, canonical hash stability,
      doc parse round-trips

## 3. @shared/sdk

- [x] 3.1 preset() marker + PresetApplied carrier
- [x] 3.2 builtins: strip, pick (transform factories); auth factories: header, bearer
- [x] 3.3 defineProvider / defineEndpoint (identity + typing)
- [x] 3.4 Tests incl. type-level expectations

## 4. @shared/compiler + scripts/compile.ts

- [x] 4.1 Discovery + id inference + slug assertions
- [x] 4.2 Provider fusion (servers/auth/timeouts push-down)
- [x] 4.3 zod → JSON Schema (input trio, output.schema, authParams)
- [x] 4.4 Fn extraction: source capture, canonicalize, closed-term lint, sha256,
      interning; parametric args serialization
- [x] 4.5 minEngineVersion derivation (fn api + structural since map)
- [x] 4.6 Bundle assembly: closure check, doc validation, JCS hashes, size lints
- [x] 4.7 scripts/compile.ts: selectors (--provider/--endpoint), .output/ cache
      keyed by input hash + ENGINE_VERSION
- [x] 4.8 Golden snapshot tests (exa docs + fnTable; interning assertion) +
      double-compile determinism test

## 5. engine/

- [x] 5.1 errors.ts (codes incl. retriable) + engine.ts (ENGINE_VERSION, Engine.load)
- [x] 5.2 link.ts: presence/integrity/abi gates, instantiation, parametric application
- [x] 5.3 host.ts: EngineHost (engine.J) implementation
- [x] 5.4 validate.ts: ajv 2020-12 wrappers (input trio, output, authParams) + zUsage
- [x] 5.5 request.ts: RunInput → PreparedRequest
- [x] 5.6 auth.ts: applyAuth (params validation + auth fn execution)
- [x] 5.7 transport.ts: Transport port, directTransport (env params, injectable
      fetch, AbortController), relayTransport stub
- [x] 5.8 usage.ts: computeUsage (defaults, zero-on-error, evidence via compute)
- [x] 5.9 LoadedEndpoint pipeline + run() loop
- [x] 5.10 scripts/run.ts (engine:run JIT via cache) + scripts/version-check.ts
- [x] 5.11 Engine tests: gates (UNSUPPORTED_DOC/UNKNOWN_FN/LINK_INTEGRITY/
      MISSING_CREDENTIAL/BAD_USAGE), pipeline order, error-as-data

## 6. @shared/testing + connectors/exa

- [x] 6.1 fixtures.ts: record/replay fetch; runner runEndpoint({unit, input, mode})
- [x] 6.2 scripts/record.ts task
- [x] 6.3 connectors/exa/provider.ts + endpoints/search (schema/inputs.ts ported from v1,
      drift fixed; endpoint.ts) + endpoints/contents
- [x] 6.4 Fixtures: search happy/provider-error; contents happy/provider-error
- [x] 6.5 Endpoint tests (replay assertions incl. usage measures + stripped fields;
      gated live tests)

## 7. CI + README

- [x] 7.1 .github/workflows/ci.yml: check, double-compile determinism, replay tests,
      openspec validate; nightly live matrix; bundle artifact upload
- [ ] 7.2 shared/testing/goldens/ scaffolding (first golden lands with the 0.1.0 release tag)
- [x] 7.3 README: authoring guide, bundle format, task reference, versioning contract

## 8. Refinement: fn layering (post-review)

- [x] 8.1 Schema layout: connectors/<slug>/schema/ + endpoints/<name>/schema/inputs.ts
- [x] 8.2 usage.capture deleted; zUsage gains evidence; compute returns receipts
- [x] 8.3 JsonKit → EngineHost (engine.J), J.merge added; fn param renamed engine
- [x] 8.4 factory → preset (author term) / parametric (fnTable kind)
- [x] 8.5 sdk namespaces: transform.{strip,pick,append}, auth.{header,bearer,query}
- [x] 8.6 Specs + design.md (D4/D5/D6/D13) + README updated; version-check paths

## 9. Refinement: zod-first restructure (post-review round 2)

- [x] 9.1 config.yml (contract override-free / tooling app-config precedence) +
      shared/app-config copied from monid-services (pino/AWS stripped)
- [x] 9.2 connectors/categories.ts leaf registry; compile-time closed-vocabulary
      validation; bundle.taxonomy aggregation
- [x] 9.3 shared/schema: granular zod-first layout (common/json/usage/taxonomy/
      fn/endpoint/provider/resource/bundle/presets), no src/; seed/def twins via
      z.input/z.output; sdk absorbed and deleted
- [x] 9.4 ctx = {data, utils}: slot zod pairs in fn/slots.ts; JsonUtil defined
      in json/util.ts, implemented in engine/json-util.ts
- [x] 9.5 Compiler: TS-printer canonicalization (fmt subprocess + hand-rolled
      comment stripper deleted); def intake re-parse; toolchain stamping
- [x] 9.6 Engine: slot-contract wrapping (FN_CONTRACT absorbs BAD_USAGE);
      no src/; engine/mod.ts at package root
- [x] 9.7 Tests: unknown-leaf failure, zBundle round-trip, FN_CONTRACT (junk +
      throw), canonicalization equivalence, contract-loader env guard,
      app-config precedence
- [x] 9.8 Docs: design.md D4/D5 amended + D14–D18; spec deltas; README;
      version-check contract paths

## 10. Refinement: round 3 (semver, pipeline names, core/logging split)

- [x] 10.1 config.yml component-first (schema/compiler/engine/cli); semver
      spec_version "1.0.0"; doc_format_since + fn_abi_since; per-namespace
      logging: subtrees (tooling carve-out, ignored by the contract loader)
- [x] 10.2 @shared/logging: structural Logger interface + pino adaptor;
      compiler/CLI logger seams; engine default = silent no-op (type-only import)
- [x] 10.3 @shared/core (schema+sdk merged): fn slots as zod v4 z.function
      factories; meta split (zEndpointMeta/zProviderMeta); auth {inject,
      credentials}; request path+baseUrl; input.schema/toRequest +
      output.fromResponse/schema; usage {compute required, redact};
      resources removed; zBundle.superRefine invariants; load/ (connector-tree,
      categories); presets namespace (transform/auth/usage — auth.query dropped);
      stableStringify via canonicalize npm
- [x] 10.4 Compiler: normalizeFnSource rename; discover.ts deleted (pure
      mapping); chain assembly (ordered $fn arrays, provider first); data
      fallback + baseUrl resolution; usage.compute required error; auto-only
      minEngineVersion; lazy provider interning (no orphan entries); fnAbiSince
      stamping; presets# provenance
- [x] 10.5 Engine: .implement() slot wrapping → FN_CONTRACT; chained hook
      execution; sniffing decode (DECODE_FAILED removed); host-gated
      usage.redact (EngineCtx.applyUsageRedaction); auth {inject, credentials}
      through PreparedRequest; catalog.ts (listProviders/listEndpoints/
      inspectEndpoint); logger seam
- [x] 10.6 connectors/exa: new def shapes (toRequest, usage.redact via
      presets.transform.strip, provider defaults.request.baseUrl)
- [x] 10.7 scripts: loadConnectorTree wiring; engine:run --list/--inspect;
      version-check contract paths → shared/core
- [x] 10.8 Tests: chain order, OSS-skips/hosted-applies redaction, non-JSON
      string passthrough, usage-required error, no-baseUrl error, catalog,
      core invariants (env guard, RFC 8785, path subset, logging carve-out)
- [x] 10.9 Docs: design.md D19–D23 + Concepts Reference glossary; spec deltas;
      proposal; README

## 11. Refinement: round 4 (one fallback rule, no redaction, strict JsonUtil, layout v2)

- [x] 11.1 @shared/core layout v2: schema/ (contract shapes — slots/ one file
      per slot with ctx data beside the z.function factory; fn-table/;
      sections/ shared by both defs; endpoint/ provider/ bundle/ …);
      presets/ gains the preset() marker; load/ renames (loadConnectorDefs,
      loadCategoryRegistry); catalog.ts (pure bundle readers) in core;
      engine/catalog.ts deleted
- [x] 11.2 ONE composition rule: leaf-wise fallback everywhere (endpoint ??
      provider ?? config default) — flat provider (defaults: wrapper gone),
      hooks fall back (chain arrays deleted; single $fn per hook), meta
      docsUrl/categories inherit; compiler completeness check (url,
      auth.inject, usage.compute)
- [x] 11.3 usage.redact REMOVED from the standard (OSS-optics: nothing in the
      format behaves differently per operator); four slots;
      applyUsageRedaction gate deleted; cost/units names kept with meanings
      documented
- [x] 11.4 JsonUtil strictness: strict get/num/len (throw on absence) +
      optionalGet/optionalNum/optionalLen; type mismatch + bad path syntax
      always throw; transformers stay tolerant; throws surface as FN_CONTRACT
- [x] 11.5 Bundle maps: providers/endpoints keyed by slug/id (uniqueness by
      construction; superRefine key==identity); sealUnit O(1)
- [x] 11.6 Uniform parsing: parseSchema/createParser/formatZodError
      (monid-services parser.ts pattern) used by defines, compiler, config;
      engine formats BAD_DOC with formatZodError
- [x] 11.7 zJson = z.json() (zod v4 built-in; finite numbers hold); determinism
      sort comment at the compiler sort site
- [x] 11.8 CLI: deno task catalog (providers | endpoints --provider/--category
      | categories | inspect); engine:run --body/--query-params/--path-params
      (--input escape hatch later removed — see 18.x)
- [x] 11.9 Meta trim: deprecated + tags removed; description roles defined
      (summary = one line, description = full text, string[] → string)
- [x] 11.10 exa: flat provider; stream unexposed (schema comment + defensive
      toRequest strip); rich v1 meta texts ported (stale billing sentence
      dropped); costDollars faithful in output; optionalNum for cost
- [x] 11.11 Tests (54): strict/optional lookups, hook-fallback semantics,
      completeness errors, map-keyed bundles, parseSchema error shape,
      catalog readers, FN_CONTRACT on typo'd path
- [x] 11.12 Docs: design.md D19–D25 + glossary rewrite (slot primer,
      interning, carriers, sealed unit, FN_CONTRACT); all spec deltas; README

## 12. Refinement: round 5 (consolidation, money, hooks, structural cleanups)

- [x] 12.1 usage.consolidate: engine-executed hook (raw envelope, after
      compute, before fromResponse) absorbing vendor billing fields into the
      structured usage; exa strips costDollars for every operator
- [x] 12.2 Money: zMonetaryValue/zCurrency/zMonetaryUnit ported from
      monid-services (micro-dollar canon); usage.cost is monetary; Unit.USD
      dropped; utils.money.fromDollars/fromMicroDollars on the host ABI;
      deprecated .finite() removed
- [x] 12.3 Vocabulary: "slot" → hook; schema/slots/ → schema/hooks/ (one file
      per hook, ctx data beside its Contract); XxxSlot → XxxContract; carrier
      documented as the contract's stand-in (z.function is not a ZodType)
- [x] 12.4 fnTable kind "parametric" → "factory" (well-known term; baking
      alternative recorded as rejected); zSha256Key → zFnId + zDocHash
      (algorithm-agnostic names, sha256: value prefix = migration mechanism)
- [x] 12.5 ProviderDoc slimmed to {specVersion, name, minEngineVersion, meta,
      hash}; provider slug → name; ConnectorSource = {provider, endpoints}
      with folder==name asserted in loadConnectorDefs; zTimeoutsSeed →
      zTimeoutsSection
- [x] 12.6 config.yml: doc_format_since + fn_abi_since moved to schema:
      (declared FORMAT/ABI facts); cli: renamed scripts:
- [x] 12.7 Engine structure: engine/interfaces/mod.ts (public interface;
      classes implement); engine/json-util.ts → fn-utils.ts (ONE ctx.utils
      implementation site); link.ts placement rationale documented
- [x] 12.8 Catalog readers simplified (inspect returns the doc itself;
      listings spread existing shapes + counts); scripts rebuilt on
      @cliffy/command
- [x] 12.9 Tests (56): consolidate ordering (compute sees what consolidate
      removes; fromResponse never does), moneyUtil, factory interning across
      connectors, slim ProviderDoc, folder/name mismatch, catalog identity
- [x] 12.10 Docs: design.md D26 + glossary rewrite (hooks primer,
      factory/carrier/consolidation rows); all four spec deltas; README

## 13. Refinement: round 6 (compute merged into the settle fn)

- [x] 13.1 usage.consolidate = THE settle fn: (raw envelope) → {usage,
      output?} — one required hook replaces the compute/consolidate pair;
      output absent = unchanged; zConsolidated pair contract (FN_CONTRACT
      covers both halves); hooks down to four
- [x] 13.2 Ordering locked BEFORE fromResponse (billing truth anchors to the
      wire; facts before presentation); placement kept under usage:
      (responsibility, not field count); fromResponse deliberately does NOT
      receive usage (additive later) — all recorded in D27
- [x] 13.3 presets.usage.perCall/perResult return {usage} only; exa endpoints
      collapse to one settle fn each (still byte-identical → one interned
      entry); compiler requires consolidate (endpoint ?? provider)
- [x] 13.4 Engine: linkFns/pipeline for the pair; zero usage forced on vendor
      error (hook never runs)
- [x] 13.5 Tests (59): pair-shape enforcement (bad usage half AND bad output
      half), absent-output passthrough, settle-before-fromResponse ordering,
      required-consolidate error, exa replay + interning
- [x] 13.6 Docs: design.md D27 + glossary (4 hooks, settle-fn rows); all four
      spec deltas; README; tasks.md §13

## 14. Refinement: round 7 (structured LoadFilter + the no-.default() rule)

- [x] 14.1 LoadFilter = {provider?, endpoint?(bare name, requires provider)} —
      dual encoding removed (no id strings, no split("#"), no silent
      endpoint-beats-provider precedence); loud error on endpoint-without-
      provider
- [x] 14.2 Ids parsed ONCE at the CLI boundary: scripts/lib.ts
      parseEndpointId("exa#search") → {provider, endpoint}; run/record/
      catalog-inspect/compile split there; sealUnit keeps the bundle id form
- [x] 14.3 No-.default() rule recorded: shared section fields are .optional(),
      never .default() (parse-time defaults would shadow the other scope's
      explicit value); comment on zAuthSection.credentials; D20 amendment +
      glossary Fallback clause; spec scenarios
- [x] 14.4 Tests (61): endpoint-filter-without-provider throws; endpoint
      overriding only inject inherits the PROVIDER's explicit credentials

## 15. Refinement: round 8 (compile everything; look up in the bundle)

- [x] 15.1 LoadFilter DELETED — loadConnectorDefs(connectorsDir) always loads
      the whole tree; compileToOutput() takes no selector; ONE artifact
      (.output/catalog.json) behind ONE cache key (the key already hashed
      every source, so partial compiles never saved anything)
- [x] 15.2 compiler:compile loses --provider/--endpoint; engine:run / catalog
      inspect / record compile the whole repo (cached) and pick from the
      BUNDLE (sealUnit / inspectEndpoint); parseEndpointId survives only for
      record's fixture path
- [x] 15.3 Unknown ids surface at bundle-lookup time ("endpoint not in
      bundle") — new test; round-7 filter tests removed with the filter
- [x] 15.4 Docs: design.md D28 (incl. the JIT clarification — JIT motivated
      the cache, not the filter — and the accepted broken-def trade-off);
      compiler spec requirement replaced (whole-repo compilation); schema +
      engine spec updates; README

## 16. Refinement: round 9 (Run* result family)

- [x] 16.1 schema/run/ = the run vocabulary: zRunInput (moved from
      common/http.ts; barrel unchanged) + zRunCompleted/zRunRunning/
      zRunResult — zod-first, flat, kind-discriminated (fixes the D15
      violation; shapes cross Temporal boundaries by value)
- [x] 16.2 Tick/Completed deleted: start/poll → RunResult; run() →
      RunCompleted directly (no {status, result} unwrap); engine interfaces
      re-export the types
- [x] 16.3 monid-services lifecycleResults comparison recorded in D29
      (adopted: names/zod/kind/flat; rejected with reasons:
      providerHttpStatus pair, actualCost-on-error, metadata,
      stop.unresolved/providerRunId — with the per-phase derived-variant
      split as the written async evolution path)
- [x] 16.4 Call sites: engine/runner updated; tests unchanged-and-green (61)
      — flattening was transparent to run() consumers

## 17. Refinement: round 10 (compact normal form)

- [x] 17.1 normalizeFnSource gains the COMPACT pass: scanner-join of the
      printed AST output onto one line (reScanTemplateToken /
      reScanSlashToken; verbatim literal token text; minimal-separator rule)
      — no newlines/tabs in the fnTable outside literal contents
- [x] 17.2 Discovery recorded: the TS printer is layout-sensitive (preserves
      source line layout), so the pre-compact form was never fully canonical
      — compaction is what makes normalization layout-independent (new test:
      single-line vs multi-line variants now share one fn id)
- [x] 17.3 Parser-authority safety gate: compacted source re-parsed and
      AST-compared to the printed form; any tokenization drift fails
      compilation loudly (byte-compare gate rejected — printer layout
      sensitivity makes it structurally unsound)
- [x] 17.4 Tests: compact shape, CRLF/tab/layout twins, template-\n + regex
      verbatim, division-vs-regex; D18 amendment + glossary + compiler spec

## 18. Refinement: CLI one-encoding + README split

- [x] 18.1 engine:run/record input flags = zRunInput fields in kebab
      (--body/--query-params/--path-params); --input escape hatch removed
      (dual-encoding smell); record gains query/path params (was a live gap
      for GET endpoints)
- [x] 18.2 README split: short README (what Monid is + repo purpose +
      examples + connectors table) linking to DEVELOPMENT.md (component-
      organized deep guide: concepts, defs, compiler, engine, usage,
      config, versioning, CLI reference, authoring, layout)
