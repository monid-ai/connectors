# Tasks — add-schema-refinement-hooks

## 1. Contract

- [ ] 1.1 `shared/core/schema/hooks/refine.ts` — the refinement fn contract
      (D2 ABI), input + output carriers.
- [ ] 1.2 Doc slots: `doc.input.refine?[]` / `doc.output.refine?[]`
      (`zFnRef` lists, omitted-when-empty), `fnKeysOf` entries.
- [ ] 1.3 CONTRACT_PATHS + `config.yml` `doc_format_since`/`fn_abi_since`
      bumps; ENGINE_VERSION minor bump; `deno task version:check` green.

## 2. Compiler

- [ ] 2.1 Harvest `.refine`/`.superRefine` closures off each schema carrier
      (`schema._zod.def.checks[]`), normalize/lint/intern like hook fns;
      contract test pinning the harvest against the locked zod version.
- [ ] 2.2 Closed-term lint: a capturing refinement fails compile with a
      message naming the schema path and the capture.
- [ ] 2.3 Determinism: double-compile byte-identical with refinements
      present; `[]` unrepresentable.

## 3. Engine

- [ ] 3.1 Input phase: JSON-Schema validate → refine (INVALID_INPUT on
      rejection) → toRequest; estimates run the same gate.
- [ ] 3.2 Output phase: fromResponse → refine, REPORT-ONLY
      (`output.refinements` warnings); a paid run never fails here.
- [ ] 3.3 Engine tests: rejection shape, ordering, report-only posture,
      doc-too-new rejection on an 0.3.x engine.

## 4. Rule ports (reconcile-report §4.5 inventory, v1 verbatim)

- [ ] 4.1 tinyfish `/search` (recency×dates, after≤before, pub_year order,
      research_paper filters) + `/fetch` (validators single-URL rule).
- [ ] 4.2 fundable exactly-one identifier rules (6 GET lookups; the POST
      `refineNonEmptyBody` rules).
- [ ] 4.3 pdl enrich identifier combinations (person + company).
- [ ] 4.4 minimax image mode×field intersection; music lyrics rule; TTS
      voice/emotion/voice_modify rules; H3 + hailuo cardinality and
      resolution×duration rules.
- [ ] 4.5 bytedance frame-pairing/ratio-adaptive rules (provider note 6
      becomes enforcement, note retained).
- [ ] 4.6 ploid provide-X-or-Y reads + agent output_schema rule; suzanne
      per-model shape rules.
- [ ] 4.7 One schema-gate test per ported rule; `deno task test` green.
