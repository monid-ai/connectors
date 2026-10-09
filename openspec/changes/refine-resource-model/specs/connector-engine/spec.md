# connector-engine (delta)

## MODIFIED Requirements

### Requirement: Loaded resources speak the lifecycle verbs
`RunnableResource` SHALL expose `verify(resource)`, `release(resource)`,
`refresh(resource)`, `reconcileUsage(line, resource, window)` (the
per-line cumulative meter; error when the line has no reconciler), and
`view(kind, resource, args?)`. Every method validates the instance
(identity + data schema) on the way in; op fns receive
`data.resource` (no target).

#### Scenario: Meter for an estimated line
- **WHEN** the host calls `reconcileUsage("storage", resource, window)`
- **THEN** the doc's `reconcileUsage.storage.get` runs with
  `{ resource, window }` and its outcome validates

### Requirement: Gated instances ride into lifecycle fns
The engine SHALL pre-gate ownership for every gated binding entry
(uses/updates/releases/reads with a resolved `key`) in the canonical
order (uses → updates → releases → reads; declaration order within a
purpose) BEFORE any upstream effect — any miss SHALL yield the uniform
vendor-shaped 404 as data with zero usage — and SHALL pass every gated
`OwnedResource` to lifecycle fns as `data.resources[alias]`. Pure hooks
SHALL stay input-only.

#### Scenario: No second reader call
- **WHEN** a gated endpoint's start fn needs the owned instance
- **THEN** it reads `data.resources[alias]` without calling
  `utils.resources.owned`

### Requirement: accrued() delegates to the estimate
`accrued(input, elapsedMs)` SHALL run the doc's estimate with
`elapsedMs` set; docs without `updateEstimateEveryMs` return the static
estimate. Settle marks derive from the purpose-keyed bindings
(provisions → seeds on the RAW envelope; uses → reconciles;
updates → refreshes; releases → releases).

#### Scenario: Live curve
- **WHEN** `accrued(input, 150_000)` runs on a doc with
  `updateEstimateEveryMs`
- **THEN** the estimate fn sees `data.elapsedMs === 150000`

## ADDED Requirements

### Requirement: The resource store port
The engine SHALL define `IResourceStore extends ResourceReader` with
resource-verb methods: `provision(resource)`, `refresh(id, externalId,
data)`, `release(id, externalId)`, `get(id, externalId)`, `list()`.
Hosts and local tooling implement it; the engine itself only consumes
`ResourceReader`.

#### Scenario: monid-services plugs in
- **WHEN** a host already implements ResourceReader
- **THEN** implementing `provision`, `refresh`, `release`, `get`, and
  `list` completes the store
