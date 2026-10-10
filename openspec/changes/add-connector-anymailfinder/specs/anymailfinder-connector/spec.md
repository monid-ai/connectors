# anymailfinder-connector (delta)

## ADDED Requirements

### Requirement: Anymail Finder provider definition
The anymailfinder provider SHALL declare name `anymailfinder`,
`request.baseUrl` `https://api.anymailfinder.com/v5.1`, auth
`presets.auth.header("Authorization")`, a single `default` credit pool
labelled "Anymail Finder credits", a provider-level `usage.consolidate`
that plucks `$.credits_charged` as the claim, and a provider-level
`output.fromError` that reads `message` and `error` from the envelope.

#### Scenario: Catalog surface
- **WHEN** the bundle is compiled
- **THEN** exactly `anymailfinder#find-email/person`,
  `anymailfinder#find-email/decision-maker`,
  `anymailfinder#find-email/company`, and `anymailfinder#verify-email`
  exist

### Requirement: Charged only for verified results
`find-email/person` SHALL consume 1 `default` credit and
`find-email/decision-maker` 2, each counted 1 only when the response's
`email_status` is `valid`. `find-email/company` SHALL consume 1 credit,
counted 1 only when `valid_emails` is non-empty. `verify-email` SHALL
consume 0.2 credits, counted 1 per verification whatever the verdict.
Every endpoint SHALL count zero when the response reports
`credits_charged: 0` (a free 30-day repeat). The vendor's `credits_charged` SHALL be
the claim and SHALL be absent from the output.

#### Scenario: Verified find
- **WHEN** a `find-email/person` run returns 200 with `email_status`
  `valid` and `credits_charged: 1`
- **THEN** usage is `{credits: {default: 1}, evidence: {RESULT: 1}}`

#### Scenario: Misses and risky results are free
- **WHEN** a find returns 200 with `email_status` `not_found` or `risky`
  and `credits_charged: 0`
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: Verification costs the same whatever the verdict
- **WHEN** a `verify-email` run returns 200 with `email_status` `invalid`
- **THEN** usage is `{credits: {default: 0.2}, evidence: {RESULT: 1}}`

#### Scenario: A 30-day repeat is free
- **WHEN** any endpoint returns 200 with `credits_charged: 0`, verified
  hit included
- **THEN** usage is `{credits: {}, evidence: {RESULT: 0}}`

#### Scenario: Errors are free
- **WHEN** the vendor answers 401
- **THEN** the run completes as provider-error data with
  `{credits: {}, evidence: {}}`

### Requirement: Faithful input mirrors
Each body SHALL mirror the v5.1 OpenAPI document and be strict.
`find-email/person` SHALL require `linkedin_url`, or a company (`domain`
or `company_name`) with a name (`full_name`, or `first_name` +
`last_name`). `find-email/decision-maker` SHALL require a company and
`decision_maker_category` (1 to 5 strings). `find-email/company` SHALL
require a company and mirror `email_type` (`any`|`generic`|`personal`).
`verify-email` SHALL require `email`.
