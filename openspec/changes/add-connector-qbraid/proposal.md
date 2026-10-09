# Proposal: add-connector-qbraid

## Why

qBraid (qbraid.com) is a cloud platform for quantum computing. One API
key reaches QPUs and simulators across AWS Braket, Azure Quantum, IBM,
IonQ and qBraid's own backends, plus OpenQASM tooling and a free
state-vector simulator. qBraid applied to be a Monid tool provider and
was invited to open this connector PR (2026-09-21).

It is the first connector in the `quantum-computing` category, and the
first whose billable endpoint answers 201 for a REJECTED submission.

## What Changes

- **connectors/qbraid**: 10 endpoints over
  `https://api-v2.qbraid.com/api/v1` with the `X-API-Key` header.
  - Devices: `list-devices`, `get-device`, `get-device-calibration`.
  - Providers: `list-providers`.
  - OpenQASM tooling: `validate-qasm`, `parse-qasm`, `convert-qasm`,
    `simulate-circuit` (up to 20 qubits).
  - Jobs: `estimate-job-cost`, `submit-job`.
- **Ids are pinned slugs** (design D1). Device paths carry a `{qrn}`
  placeholder, so a derived id would be unreadable.
- **The pool is qBraid credits, 100 credits = $1 USD** (design D3).
  Nine endpoints are FREE. `submit-job` alone bills: the finished job's
  own `cost` is the claim, metered in millionths of a credit so the
  engine fold matches qBraid's 6-decimal prices exactly (design D10).
- **`submit-job` is an async run** (design D9). It submits, polls to a
  terminal status, and returns `{job, result}` in one run. The job QRN
  stays in run state. A rejected 201 settles as a 502 (design D4); a
  FAILED or CANCELLED job settles as a 500 carrying its `statusMsg`.
- **No QRN-addressed routes** (design D9). Under one shared key a QRN is
  guessable, so a job read or cancel would reach other callers' jobs.
- **A 30-minute run budget** (design D11). On expiry the run cancels the
  job upstream, and qBraid refunds it.
- **New category leaf** `quantum-computing` in `connectors/categories.ts`.
- **Real recordings** for every endpoint's happy and error chains,
  scrubbed. Three `submit-job` fixtures stay `synthetic-` (design D8).

## Capabilities

- `qbraid-connector`.

## Non-goals

- **Account and organization routes**: account, organization, wallet,
  billing, membership, credit requests, API keys. They read or change
  the key owner's own account (design D2).
- **Job listing, deletion and groups** (`GET /jobs`, `DELETE /jobs`,
  `/jobs/group`, `/jobs/summary`, `/jobs/statuses`). Under a
  platform-held key every Monid caller shares one qBraid account, so a
  list would show one caller's jobs to another (design D2).
- **Routes addressed by a job QRN** (`GET /jobs/{qrn}`,
  `/jobs/{qrn}/result`, `/jobs/{qrn}/cancel`). `submit-job` calls them
  inside its own run only (design D9).
- **Compute servers, SSH keys, Lab storage, notifications, kernels,
  environments.** Stateful Lab resources, not data or compute calls.
- **Admin routes** (`/devices/admin`, provider ownership, device
  updates). Staff-only.
- **Program read-back** (`/jobs/{qrn}/program`, `/compiled-program`,
  `/program/ascii`) and `/jobs/{qrn}/restore`. They are QRN-addressed,
  so D9 rules them out as endpoints.

## Impact

New connector tree plus one new category leaf. No engine bump, no new
`Unit` (`CREDIT` exists), no new preset (`presets.auth.header` carries
`X-API-Key`), no hook-ABI change. `connectors/ids.lock.json` gains the
10 `qbraid#…` ids and nothing else.
