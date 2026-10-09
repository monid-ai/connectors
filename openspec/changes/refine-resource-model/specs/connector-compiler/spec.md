# connector-compiler (delta)

## MODIFIED Requirements

### Requirement: Resource compilation follows the refined shapes
The compiler SHALL compile the `usage` rate card verbatim (data), intern
`reconcileUsage.*.get`, `lifecycle.verify/release/refresh`, `views.*.read`
and webhook `route/subscribe/unsubscribe` fns with the
`resources_since` stamp, and enforce: every estimated line has a
reconciler and every reconciler names an estimated line; `everyMs ≥
3_600_000`; `updateEstimateEveryMs` ⇒ lifecycle.poll resolves AND the
model has metered lines; purpose-keyed binding coherence (≤1 provisions;
`key` present where required; dead-key lint per gated entry; `as`
uniqueness; input ⊇ slot required props per purpose); resource `slug`
=== folder (endpoint `endpoint:` stays optional — `?? request.path`).

#### Scenario: Reconciler for a fixed line
- **WHEN** `reconcileUsage.rent` names a FIXED line
- **THEN** compilation fails (only estimated lines reconcile)

#### Scenario: Duplicate alias
- **WHEN** two gated entries resolve to the same `as`
- **THEN** compilation fails naming both

## ADDED Requirements

### Requirement: The identity lock
A committed `connectors/ids.lock.json` SHALL list every published
provider/endpoint/resource/webhook id; `deno task ids:check` SHALL fail
when a locked id no longer compiles (removal/rename) unless the lock is
regenerated via `--update` (a reviewable diff). New ids never fail the
check.

#### Scenario: Silent rename caught
- **WHEN** a resource slug changes without a lock update
- **THEN** `ids:check` fails naming the missing id
