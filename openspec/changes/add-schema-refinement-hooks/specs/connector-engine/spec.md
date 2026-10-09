# connector-engine — delta

## ADDED Requirements

### Requirement: Input refinements gate pre-flight

The engine SHALL run `input.refine[]` after JSON-Schema validation and
before `input.toRequest`, for runs AND estimates. A rejection SHALL raise
INVALID_INPUT (deterministic, never retriable, no vendor traffic, no
usage).

#### Scenario: a rejected combination never reaches the vendor

- GIVEN a doc whose refinement forbids `recency_minutes` with `after_date`
- WHEN a caller supplies both
- THEN the run fails INVALID_INPUT with zero transport calls and zero usage

### Requirement: Output refinements are report-only

The engine SHALL run `output.refine[]` after `output.fromResponse` and
surface failures as warnings on the result. An output refinement SHALL
never change the run's status or its settled usage.

#### Scenario: a paid run with a surprising output shape still settles

- GIVEN a 2xx run whose output fails an output refinement
- WHEN the run settles
- THEN httpStatus and usage are unchanged and the result carries the
  refinement warning
