# connector-schema (delta)

## ADDED Requirements

### Requirement: A resource declares a generic type

A `ResourceDef` SHALL carry a REQUIRED `type` drawn from a CLOSED
vocabulary (`ResourceType`), and the compiled `ResourceDoc` SHALL carry
it verbatim as inline data.

The vocabulary SHALL hold exactly the kinds the repo ships — one entry
per resource def in tree, added WITH the def. The resource `id`
(`<provider>/<slug>`) remains the unique identity; `type` is the
cross-provider grouping axis and SHALL NOT be treated as unique.

#### Scenario: Two providers renting numbers group together

- **WHEN** two providers each declare a resource of type `phone_number`
- **THEN** a type filter SHALL return both
- **AND** their ids SHALL remain distinct and provider-scoped

#### Scenario: An undeclared type fails

- **WHEN** a def declares a `type` outside the vocabulary
- **THEN** parsing the def SHALL fail

### Requirement: A resource declares NAMED lookup keys

A `ResourceDef` SHALL support an optional `keys` record of snake_case
key name → restricted JSONPath, each path rooted at the resource's own
`data` snapshot. The compiled doc SHALL carry them as inline data (no
fn).

Lookup keys are an INDEX INTO identity, never a second identity:
`zResourceTarget` SHALL remain `externalId`-only, so every settle mark,
provision seed and webhook target names exactly one address.

#### Scenario: A declared key is resolvable from stored data alone

- **WHEN** a host holds an owned instance and the doc's `keys`
- **THEN** it SHALL resolve each value without executing any fn

#### Scenario: A path that reads nothing yields no key

- **WHEN** a declared path resolves to absent, empty, or a non-string
- **THEN** that key SHALL be absent from the instance
- **AND** the instance SHALL remain addressable by its `externalId`

### Requirement: An owned instance carries its identity

`zOwnedResource` SHALL carry OPTIONAL `type`, `identifier` and resolved
`keys` beside `externalId` and `data`.

`identifier` is the human/agent-facing handle and SHALL default to
`externalId` when a host has nothing better; it SHALL NOT be used as an
address. The fields are optional so a hand-written fixture window need
not restate what the def already declares.

#### Scenario: A provision seed's identifier survives persistence

- **WHEN** a provision seed carries an `identifier` distinct from its
  `externalId`
- **THEN** the persisted instance SHALL carry that `identifier`

## MODIFIED Requirements

### Requirement: The ownership query accepts any declared handle

`zResourceQuery.externalId` SHALL accept the primary `externalId` OR any
value a host has indexed from the doc's declared `keys`. A reader SHALL
return the SAME canonical instance for either, so callers never learn
which handle they used.

An unknown handle SHALL resolve to nothing. Resolution SHALL NOT widen
the ownership window.

#### Scenario: The gate accepts a lookup key

- **WHEN** a bound endpoint's key resolves to a value the host indexed
- **THEN** the gate SHALL pass and the instance SHALL ride into the fn

#### Scenario: The gate still fails closed

- **WHEN** the input names neither a known `externalId` nor an indexed key
- **THEN** the run SHALL complete as the uniform vendor-shaped 404 with
  zero usage and no upstream request
