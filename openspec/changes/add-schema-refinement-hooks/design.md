# Design — schema refinement hooks

## D1 — Harvest from the zod, don't add authoring surface

The refinement is authored where v1 authored it: on the schema, with
`.refine()`/`.superRefine()`. The compiler walks the schema's own checks
list and lifts each closure into the fnTable. Rationale: (a) v1 parity —
every rule in the port inventory is a copy-paste restore, not a rewrite;
(b) the link question answers itself — the fn came off that schema at that
path, provenance is positional (`input.body` check #2), no registry or
naming; (c) a sibling `refine:` slot would let schema and rule drift apart
in review.

Risk accepted: `schema._zod.def.checks[]` is zod-internal shape. The
compiler pins the zod version already (deno.lock) and the harvest gets its
own contract test; if a zod upgrade breaks the walk, the FALLBACK design
(explicit `input.refine` / `output.refine` def slots carrying the same fn
shape) is doc-format-compatible — only the harvest layer changes.

## D2 — Refinement fn ABI

`({ data }) => void | { path?: string[], message: string }[]` — data carries
the SAME validated value the JSON Schema just passed (`data.value`), plus
`data.location` ("body" | "queryParams" | "pathParams" | "output"). A
non-empty return (or throw) is the rejection; entries mirror zod issue
shape so the engine's INVALID_INPUT message reads like a validation error.
Closed-term rules apply unchanged (no imports, no captures, whitelisted
globals). Hashing/interning identical to every other hook fn.

## D3 — Engine phases

- INPUT: validate (JSON Schema) → `input.refine[]` (each, in doc order) →
  `input.toRequest`. A refinement rejection is INVALID_INPUT — free,
  deterministic, never retriable. Estimates run refinements too (the D25
  pre-toRequest input is the refined value): a hold is never priced on an
  input the run would reject.
- OUTPUT: `usage.*` settle → `output.fromResponse` → `output.refine[]`,
  REPORT-ONLY: failures ride the result as `output.refinements` warnings
  (mismatch-signal posture). A paid run never fails on output shape — the
  standing D29 rule.

## D4 — Doc format

`doc.input.refine?: zFnRef[]` and `doc.output.refine?: zFnRef[]` — arrays,
order = authoring order (zod check order), omitted when empty (byte-identical
determinism, the add-meta-notes D3 rule). `doc_format_since` and
`fn_abi_since` move together with the ENGINE_VERSION minor bump; older
engines reject docs carrying the keys (strictObject), which is correct — an
engine that cannot enforce a doc's stated gate must not run it.

## D5 — Port order

tinyfish (rate-limit budget is the live cost) → fundable/pdl/ploid
(identifier rules) → minimax/bytedance/suzanne (mode×field rules; bytedance
provider note 6 becomes enforcement + note) → surf airdrop `phase` stays a
pattern (already expressible). Each port is copy-from-v1 + one schema-gate
test per rule.
