# connector-compiler — delta

## ADDED Requirements

### Requirement: Refinement harvest is deterministic and version-gated

The compiler SHALL emit refinement fn refs in authoring (zod check) order,
intern them content-addressed like every hook fn, and stamp docs carrying
them with the raised `doc_format_since`/`fn_abi_since` floors so an older
engine refuses what it cannot enforce.

#### Scenario: double-compile is byte-identical with refinements present

- GIVEN a repo containing refined schemas
- WHEN `deno task compiler:compile` runs twice
- THEN the two bundles are byte-identical

#### Scenario: an 0.3.x engine refuses a refined doc

- GIVEN a doc carrying `input.refine`
- WHEN an engine older than the bumped version loads it
- THEN the load fails with the version gate error
