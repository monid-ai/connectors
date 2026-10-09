# Tasks: add-connector-qbraid

## 1. Decisions (qBraid, 2026-09-22)

- [x] 1.1 Surface = the 10 routes safe under a platform-held key (D2)
- [x] 1.2 Pool = qBraid credits, 100 = $1; only `submit-job` bills (D3)
- [x] 1.3 A 201 with `success: false` settles as a 502 provider error (D4)
- [x] 1.4 `submit-job` runs the job to its result; no QRN-addressed
      routes (D9)
- [x] 1.5 Bill the finished job's `cost`; qBraid refunds FAILED and
      CANCELLED (D10)

## 2. Provider

- [x] 2.1 `categories.ts`: new leaf `quantum-computing`
- [x] 2.2 `schema/qasm.ts` (`zQasmBody`), `schema/qrn.ts` (the device QRN
      path param)
- [x] 2.3 `provider.ts`: meta + 2 notes, `X-API-Key` header preset, the
      api-v2 host, timeouts 30 s / 60 s, FREE default model, the credits
      pool, `fromError` for `{success: false, message, error}` (D5)

## 3. Endpoints (10)

- [x] 3.1 `list-devices`, `get-device`, `get-device-calibration`,
      `list-providers` — FREE
- [x] 3.2 `validate-qasm`, `parse-qasm`, `convert-qasm`,
      `simulate-circuit` — FREE, 60 s / 90 s (D7)
- [x] 3.3 `estimate-job-cost` — FREE, the pre-run quote
- [x] 3.4 `submit-job` — PER_UNIT·CREDIT at 0.000001, claim + strip on
      the finished job's `cost`, empty estimate, `lifecycle.start`,
      `poll` and `stop`, 60 s / 30 min / 5 s poll (D3, D4, D9–D11)
- [x] 3.5 Drop `get-job`, `get-job-result`, `cancel-job` and their lock
      ids (D9)

## 4. Verify

- [x] 4.1 `compiler:compile` — 10 docs; `catalog inspect
      'qbraid#submit-job'` renders
- [x] 4.2 `provider.test.ts`: literal rate table whose key set equals the
      ids; every happy run settles its row; provenance (one inject, one
      fromError, one pool; only submit-job meters, consolidates and owns
      start, poll and stop)
- [x] 4.3 Ten `endpoint.test.ts`: happy, provider error, schema gates
      with near twins, live gated on `QBRAID_CREDENTIALS_API_KEY`;
      submit-job's happy, priced, rejected-201, unknown-device, failed
      and stop chains
- [x] 4.4 Live run 2026-09-28: the free-simulator submit runs to its
      result and settles 0 credits
- [x] 4.5 `ids.lock.json`: the 10 `qbraid#…` ids only, against main
- [x] 4.6 check · test · compile

## 7. Follow-ups (not in this change)

- [ ] 7.1 Observe one paid QPU submit and replace
      `submit-job/synthetic-priced.json` with the recording
- [ ] 7.2 Record a 202 cancel on a long-queued job and replace
      `submit-job/synthetic-stop.json`
