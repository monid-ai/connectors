# connector-schema — delta

## ADDED Requirements

### Requirement: Schema refinements compile into the doc

Cross-field rules authored on an input or output zod schema with
`.refine()`/`.superRefine()` SHALL be harvested at compile into closed-term
fnTable entries, referenced from the doc as `input.refine[]` /
`output.refine[]` beside the compiled JSON Schema they guard. The keys
SHALL be omitted when no refinements exist.

#### Scenario: a cross-field rule survives compilation

- GIVEN an input body schema with a `.superRefine` enforcing "recency and
  date bounds are mutually exclusive"
- WHEN the repo compiles
- THEN the doc carries one `input.refine` entry whose fn rejects an input
  that sets both, AND the compiled JSON Schema is unchanged

#### Scenario: a capturing refinement is a compile error

- GIVEN a refinement closure referencing a module-level constant
- WHEN the repo compiles
- THEN compilation fails naming the schema path and the captured binding
