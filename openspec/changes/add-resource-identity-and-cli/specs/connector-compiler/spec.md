# connector-compiler (delta)

## ADDED Requirements

### Requirement: A dead lookup key fails the build

The compiler SHALL validate every declared `keys` path against the
compiled `data` JSON Schema. A path segment naming no property of the
schema SHALL fail `DOC_MALFORMED` naming the key, the segment and the
path ("DEAD lookup"), mirroring the existing DEAD-binding check for
endpoint resource bindings.

The walk SHALL stop permissively wherever the schema stops describing
properties (a record or additionalProperties node): unknown is not
wrong.

A key that never resolves is not a harmless no-op — it is an index the
host never writes and an id the resource silently fails to answer to.

#### Scenario: A typo'd path is caught at compile

- **WHEN** a def declares `keys: { hue: "$.colour" }` and its data
  schema has `color`
- **THEN** compilation SHALL fail with a DEAD lookup error

#### Scenario: A path through an unconstrained node is allowed

- **WHEN** a declared path descends through a node the schema does not
  describe with `properties`
- **THEN** compilation SHALL proceed

### Requirement: Identity reaches the compiled doc

`compileResource` SHALL copy `type` and `keys` onto the resource doc as
inline data, so a host filters by type and resolves keys without
executing anything.

#### Scenario: The doc carries both axes

- **WHEN** a resource def declaring a type and keys is compiled
- **THEN** the doc SHALL carry `type` and `keys` verbatim

## MODIFIED Requirements

### Requirement: The catalog reader exposes resource type

`listResources` SHALL return each resource's `type` and SHALL accept a
`type` filter, composable with the existing `provider` filter.

#### Scenario: Filtering by type

- **WHEN** `listResources` is called with a `type`
- **THEN** only resource defs of that type SHALL be returned
