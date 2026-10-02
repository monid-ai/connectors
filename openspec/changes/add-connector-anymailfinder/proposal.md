# Proposal: add-connector-anymailfinder

## Why

[Anymail Finder](https://anymailfinder.com) is a B2B work-email finder and
verifier: every address a find returns is SMTP-verified live before the
response, catch-all domains included, and a find is charged only when it
returns a verified address (https://anymailfinder.com/pricing). Submitted
by the vendor. It adds a second finder to the people-enrichment category
beside `hunterio`, plus one capability the catalog lacks: finding the
decision maker in a department at a company when the caller has no name.

## What Changes

- **connectors/anymailfinder** - provider (`presets.auth.header("Authorization")`
  on `https://api.anymailfinder.com/v5.1`, the key raw with no scheme) + 4
  synchronous POST endpoints: `find-email/person`,
  `find-email/decision-maker`, `find-email/company`, `verify-email`.
  The three finds are leaf `PER_UNIT` (1, 2 and 1 credit), counted 1 only
  when the response is a verified hit; `verify-email` is leaf `PER_CALL`
  at 0.2. Every billable response carries the vendor's own meter,
  `credits_charged`, so the provider declares ONE `consolidate` that
  plucks it as the claim and strips it from the output. Request bodies
  are `.strict()`; each find binds the vendor's identification rules as a
  `z.union`. Provider-level `output.fromError` reads the `{error, message}`
  envelope.
- **Per-endpoint synthetic fixtures** - shapes from live v5.1 responses the
  vendor recorded on 2026-10-01, placeholder values: happy, miss (200
  `not_found`), risky (person), invalid verdict (verify), and a 401.
- **openspec/changes/add-connector-anymailfinder** - this proposal; no
  `design.md` (no schema/engine contract change, no new Units).

## Capabilities

- `anymailfinder-connector`.

## Non-goals

- `GET /account` - reports the balance of the key's own account; on a
  platform key that is Monid's balance, not useful to a caller.
- Bulk file search (`/bulk/*`), GeoLead (`/geo-lead/*`) and the per-domain
  export purchase (`/domain/{domain}/email/*`): job and purchase products,
  not single priced requests.
- `POST /find-email/linkedin-url`: the same job as `find-email/person`
  with `linkedin_url` alone; listed once.
- `POST /report/bad-email`: account-scoped feedback, not an agent
  capability.

## Impact

New connector tree only; no schema/engine/compiler changes - version
stays.
