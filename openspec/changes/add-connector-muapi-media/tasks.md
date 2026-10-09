# Tasks: add-connector-muapi-media

## 1. Provider and endpoints

- [x] 1.1 Add MuAPI metadata, API-key auth, base URL, timeouts, and shared
      submit/poll lifecycle.
- [x] 1.2 Add vendor-cost consolidation and structured error digestion.
- [x] 1.3 Add Nano Banana 2 text-to-image endpoint and schema.
- [x] 1.4 Add Nano Banana 2 image-edit endpoint and schema.
- [x] 1.5 Add Veo 3.1 text-to-video endpoint and schema.
- [x] 1.6 Add current resolution-based usage cards and request-keyed
      estimate/evidence functions.

## 2. Fixtures and tests

- [x] 2.1 Add synthetic image, edit, video, task-failure, and rejected-submit
      chains.
- [x] 2.2 Test completion, URL delivery, cost stripping, error zero-billing,
      and input validation through sealed-unit replay.
- [x] 2.3 Test image and video estimates without network I/O.

## 3. Verification

- [x] 3.1 Run `deno task check` and `deno task test`.
- [x] 3.2 Run formatter, linter, compiler, catalog, and version smoke checks.
- [x] 3.3 Open the focused upstream pull request after all local gates pass.

## 4. Follow-ups

- [ ] 4.1 Add further MuAPI models only with separate capability and pricing
      evidence.
- [ ] 4.2 Re-audit the pinned cards if MuAPI's public estimator changes.
