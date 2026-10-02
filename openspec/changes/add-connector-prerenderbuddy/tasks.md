# Tasks: add-connector-prerenderbuddy

- [x] Read connector authoring rules and reference async/free-reader contracts.
- [x] Verify PB's published request schema, pricing and job protocol.
- [x] Implement four answer checks plus free status and balance reads.
- [x] Add strict inputs, documented outputs and idempotent durable lifecycle.
- [x] Add tests for settlement, retries, failures and bounded inputs.
- [x] Record and scrub real completed fixtures for all four platforms.
- [x] Confirm one PB debit per job and zero charges for reads/retries.
- [x] Run check/test/fmt/lint, double compile and identity/version gates.
      Check, full tests (1,282 pass), connector formatting, full lint, version
      check and byte-identical frozen compiles pass. The identity checker
      reports the same 83 pre-existing drift entries on untouched upstream
      HEAD and this branch; this PR adds only the six PB IDs to the lock.
- [ ] Submit the PR with contact details and hosted activation requirements.

Hosted publication, production credential provisioning and settlement agreement
are maintainer steps after review; this change does not claim catalog activation.
