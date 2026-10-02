# mermail-connector (delta)

## ADDED Requirements

### Requirement: Mermail provider definition
The mermail provider SHALL declare name `mermail`,
`request.baseUrl` `https://console.mermail.app`, auth
`presets.auth.header("x-api-key")`, a single `default` credit pool
labelled "Mermail API credits", and a provider-level `output.fromError`
that reads `error`, then `code`, from the error envelope.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `mermail#mailboxes`, `mermail#mailboxes/create`,
  `mermail#mailboxes/{mailboxId}`, `mermail#mailboxes/{mailboxId}/emails`,
  `mermail#mailboxes/{mailboxId}/emails/{emailId}`,
  `mermail#mailboxes/{mailboxId}/emails/{emailId}/context`,
  `mermail#mailboxes/{mailboxId}/search`,
  `mermail#mailboxes/{mailboxId}/emails/send`,
  `mermail#mailboxes/{mailboxId}/emails/{emailId}/reply`, and
  `mermail#mailboxes/{mailboxId}/emails/{emailId}/forward` exist
- **AND** the leaf category `email` exists

### Requirement: Flat credit billing
Reads (`mailboxes`, `mailboxes/{mailboxId}`, emails list, email get,
context, search) SHALL be leaf `PER_CALL` for 1 `default` credit.
Send, reply, and forward SHALL be leaf `PER_CALL` for 5. Create SHALL
be leaf `PER_CALL` for 10. No `consolidate`. A 2xx response, including
201 and 202, SHALL bill. A non-2xx response SHALL settle
`{credits: {}, evidence: {}}`.

#### Scenario: List settles one credit
- **WHEN** `mermail#mailboxes` returns 200
- **THEN** usage is `{credits: {default: 1}, evidence: {CALL: 1}}`

#### Scenario: Send settles five credits on 202
- **WHEN** `mermail#mailboxes/{mailboxId}/emails/send` returns 202
- **THEN** usage is `{credits: {default: 5}, evidence: {CALL: 1}}`

#### Scenario: Create settles ten credits on 201
- **WHEN** `mermail#mailboxes/create` returns 201
- **THEN** usage is `{credits: {default: 10}, evidence: {CALL: 1}}`

#### Scenario: Errors are free
- **WHEN** the vendor answers 401
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}`

### Requirement: Faithful input mirrors
Request bodies and query objects SHALL mirror the published sold-API
fields for these ten operations, optionality only, and SHALL be strict:
an unknown key fails `INVALID_INPUT` before the wire call. Create SHALL
require `email` and `name`. Send, reply, and forward SHALL require
`to`, `from`, and `subject`. Path placeholders SHALL be `mailboxId` and
`emailId`.

#### Scenario: Unknown key rejected
- **WHEN** a caller passes `workspace` instead of `workspaceId` to
  `mermail#mailboxes`
- **THEN** the run fails with INVALID_INPUT before any network call

#### Scenario: Send without a recipient rejected
- **WHEN** a caller omits `to` on
  `mermail#mailboxes/{mailboxId}/emails/send`
- **THEN** the run fails with INVALID_INPUT before any network call
