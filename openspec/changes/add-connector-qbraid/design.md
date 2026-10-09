# Design: add-connector-qbraid

Decision record for the qBraid connector. The source of truth for every
shape is the qBraid API itself (Express + valibot): request schemas from
`src/features/{device,composer,job}/validators.ts`, responses from the
controllers and `job/shared/serializers/*`, and live calls on
2026-09-22. Precedents: exa (sync POST + body), tinyfish (FREE model),
contextdev D3 (a vendor claim plucked and stripped), minimax (a
lifecycle that synthesizes a non-2xx for an in-body failure), pdl (a
404 as error-as-data).

## D1 — Ids are pinned slugs

Every endpoint sets `endpoint: "/<slug>"`. Derived ids would read
`qbraid#jobs/{qrn}/result` and would collide on `/jobs`, which serves
both the submit (POST) and, upstream, the job list (GET). The slugs match
the tool names of qBraid's own MCP server (`submit_quantum_job` becomes
`submit-job`, and so on), so an agent that knows one surface knows the
other. Folders are the slug.

## D2 — The surface is what is safe under a platform-held key

Monid calls with ONE qBraid key, so every Monid caller acts as the same
qBraid user in the same organization. The connector carries only routes
that stay correct under that:

- Reads of shared catalog data (devices, calibrations, providers).
- Stateless tools (the four composer routes, the cost estimate).
- One job route, `submit-job`, which runs the job to its result inside
  the run. The job QRN never leaves the run (D9).

Routes that enumerate or mutate the key owner's state are excluded: job
list, bulk delete, job groups, and every route addressed by a job QRN
(read, result, cancel — D9), account, organization, wallet, billing,
membership, credit requests, compute servers, SSH keys and storage (see
the proposal's non-goals). qBraid provisions a dedicated, funded
organization for Monid's key, so the owner's state is Monid's own.

## D3 — One pool of qBraid credits; only `submit-job` bills

qBraid meters one balance in credits. `CREDITS_PER_DOLLAR = 100`
(qbraid-api `billing/ai-chat/ai-chat.types.ts`), so 100 credits = $1 USD.
The provider declares one pool, `default`, labeled "qBraid credits", and
FREE as the default model. Nine endpoints inherit FREE: every read,
the composer, the 20-qubit simulator and the estimate cost 0 credits
upstream (observed on the live run).

`submit-job` overrides the model with `PER_UNIT` · `CREDIT`:

| fn | behavior |
|---|---|
| `consolidate` | plucks the finished job's `$.job.cost` as the vendor's claim and strips it, and the result's string copy, from the output (D10) |
| `evidence` | restates the same figure as `CREDIT: round(cost × 1e6)` |
| `estimate` | `{counts: {}}` — the price is a device fact the input cannot yield |

The line consumes `amount: 0.000001` per unit. The engine folds
`ceil(quantity / every) × amount`, and qBraid rounds credits to 6
decimals (`CREDIT_PRECISION_DECIMALS = 6`, qbraid-api
`shared/utils/number-utils.ts`). Counting whole credits would ceil 2.35
to 3 and ride out as a `mismatch` on every priced job; millionths fold
exactly.

The claim lives on the endpoint, not the provider: `submit-job` is the
only doc whose output carries a job.

`estimate-job-cost` is the pre-run quote. Its description and
`submit-job`'s both tell the caller to price the job there first.

## D4 — A rejected submission is a provider error

qbraid-api's `createJob` controller answers 201 for every submission and
sets `success: newJob.success || false`. A declarative doc settles any
2xx as billable success, so `submit-job` declares `lifecycle.start`: it
relays the request, returns non-2xx responses verbatim, and synthesizes
OURS 502 / THEIRS 201 for a 2xx whose `success` is not `true`. The
engine then zero-bills it. A real rejection (unknown device) comes back
as 404 and needs no synthesis.

## D5 — Errors are data

Every qBraid failure is `{success: false, message, error: {code, …}}`.
The provider `fromError` digests it to `{message, code, raw}`. Observed
codes (2026-09-22):

| case | status | `error.code` |
|---|---|---|
| garbage key | 401 | `INVALID_API_KEY_FORMAT` |
| well-formed unknown key | 401 | `INVALID_API_KEY` |
| no key | 401 | `NO_VALID_AUTHENTICATION` |
| calibration for a simulator | 404 | `NOT_FOUND` |
| submit to an unknown device | 404 | `NOT_FOUND` |
| cancel a job still initializing | 409 | `JOB_CANCEL_CONFLICT` |

`list-providers` answers 200 without any credential upstream; it is
listed for completeness and is not a key probe.

## D6 — Inputs mirror the qBraid validators

- `list-devices` query mirrors `deviceSchemas.listDevices`.
- The composer bodies are `{qasm}`, and `convert-qasm` adds
  `target_version` (`"2.0"` or `"3.0"`), snake_case as on the wire.
- `estimate-job-cost` sends `shots` as a string, as the route validates
  it.
- `submit-job` mirrors `QuantumJobCreateValidationSchema`: `shots` has
  a floor of 0 as upstream does, and `program` is one `{format, data}`
  or an array of up to 2000.
- `program.data` is `z.unknown()` with a non-null refine, mirroring the
  upstream `v.check`. A refine compiles to nothing in the JSON Schema,
  so only a missing `data` is rejected before the wire; `data: null`
  reaches qBraid and is its 400.
- The `submit-job` binding omits `groupJobQrn` and is `.strict()`. The
  schema file still mirrors the vendor field. Under the shared key a
  caller-chosen group QRN could attach jobs to another caller's group,
  for the same reason as D9. `.strict()` compiles to
  `additionalProperties: false`, so an unknown key cannot carry it past
  the binding either.

Shared fragments live in `connectors/qbraid/schema/`: `zQasmBody` and
the device QRN path param.

## D7 — Timeouts

Provider default 30 s request / 60 s run. The composer routes take
60 s / 90 s: they call qBraid's runtime service. `submit-job` takes 60 s
per request, 30 minutes per run and a 5 s poll (D11).

## D8 — Fixtures are real recordings where the free simulator allows

Happy and error chains were recorded live against a funded organization,
then scrubbed of internal ids (`_id`, `providerId`, `organizationUserId`,
`deviceId`, storage paths) and trimmed to two array items. The
`submit-job` chains were recorded on 2026-09-28 on the free simulator
`qbraid:qbraid:sim:qir-sv` with 10 shots:

- `happy.json`: 201, one QUEUED poll, COMPLETED, result. Two identical
  QUEUED polls were dropped.
- `failed.json`: a program that measures into an undeclared register.
  The job FAILS with a `statusMsg` and cost 0.
- `stop-conflict.json`: submit, then stop at once. The cancel answers
  409 `JOB_CANCEL_CONFLICT` because the job is still initializing.

Three `submit-job` fixtures stay `synthetic-`:

- `synthetic-priced.json`: the recorded happy chain re-priced to the
  observed QPU quote (265 credits for 100 shots on `aws:aqt:qpu:ibex-q1`).
  No paid job was submitted.
- `synthetic-rejected-201.json`: the 201 with `success: false` case from
  D4, taken from the controller.
- `synthetic-stop.json`: the 202 `CANCELLING` answer from the
  `cancelJob` controller. A free-simulator job is either still
  initializing or already done when a cancel lands.

Live tests gate on `QBRAID_CREDENTIALS_API_KEY` and assert response
shape only. The live `submit-job` test runs the free simulator with 10
shots to its result and costs 0 credits.

## D9 — `submit-job` is an async run; QRN-addressed routes are dropped

The first version shipped `get-job`, `get-job-result` and `cancel-job`,
each taking a caller-supplied job QRN. Review found that this breaks job
ownership. Monid holds one qBraid key, so qBraid sees every Monid caller
as the same user. A QRN ends in a Mongo ObjectId: a timestamp, a
per-process constant and a counter. Two of our own jobs were
`…6ab2125ea32f8043c5e8e9d9` and `…6ab21275a32f8043c5e8e9e7`. A caller
could guess another caller's QRN, then read or cancel that job.

`submit-job` now owns the whole job through Monid's async run protocol,
like kling, firecrawl `crawl` and surf `onchain-sql-jobs`:

- `start` sends `POST /jobs`. A non-2xx settles verbatim. A 2xx without
  `success: true` or a `jobQrn` settles as a 502 (D4). Otherwise the run
  parks RUNNING with `state.externalRunId` set to the QRN.
- `poll` sends `GET /jobs/{qrn}`, which also makes qBraid refresh the
  job from the device vendor. The terminal statuses are qbraid-api's
  `QuantumJobStatusReturned`: COMPLETED, FAILED, CANCELLED. Every other
  status stays RUNNING, with the status in `state.stage`.
- On COMPLETED the same tick sends `GET /jobs/{qrn}/result` and returns
  one output, `{job, result}`.
- On FAILED or CANCELLED the poll synthesizes OURS 500 / THEIRS 200. The
  output is shaped like qBraid's error envelope, so `fromError` returns
  the job's `statusMsg` and the code `JOB_FAILED` or `JOB_CANCELLED`.
- A failed status or result read THROWS (kling D7). The read failed, not
  the job, and a QPU job may still be running. The host retries the
  tick, and `runMs` bounds the retries.
- `stop` sends `POST /jobs/{qrn}/cancel`, best effort. A 409 or an
  already-terminal job is logged and ignored (firecrawl posture).

The output keeps an allowlist of job fields. It withholds `jobQrn` and
qbraid-api's four SDK-contract fields (`organizationUserId`, `deviceId`,
`providerId`, `gcsDestination`). The storage path embeds the QRN, so a
denylist of `jobQrn` alone would leak it. No endpoint accepts a job QRN.

## D10 — Billing settles on the finished job's `cost`

qBraid bills in two phases. At submit it holds `estimatedCost` in
escrow. At the terminal status it settles the job's `cost`:

- The runtime writes a terminal status only together with a `cost`
  (qbraid-runtime-api `app/routers/jobs_utils.py:1536`), then sends that
  `cost` as `actualCost` to settlement.
- The worker charges `actualCost` for COMPLETED and 0 for FAILED or
  CANCELLED, and refunds the rest of the escrow (worker-service
  `src/services/billing/escrow-settle.processor.ts:119-126`).
- The vendor modules also set `cost: 0` on FAILED and CANCELLED jobs
  (for example `app/runtime/aws/job_status.py:82`).

So `consolidate` claims `job.cost`, not `estimatedCost`. `estimatedCost`
stays in the output as the quote. The result route repeats the cost as a
decimal string (`"0E-33"`, `"0"`); `consolidate` strips that copy too.

FAILED and CANCELLED runs are non-2xx, so the engine bills them zero.
qBraid refunds them in full, so the two agree. No discrepancy remains.

## D11 — Run budget and stop

`timeouts` are 60 s per request, 30 minutes per run, and a 5 s poll. The
free simulator finishes in seconds. A QPU job can wait in a device queue
for hours, and the description says a queue longer than 30 minutes ends
the run.

When `runMs` expires, the engine calls `stop` and then fails the run
with TIMEOUT (`engine/engine.ts:622-630`, async-run-protocol D7). `stop`
returns nothing, so the stop result is STOPPED_UNSETTLED and the run
bills nothing. `stop` cancels the job upstream, and qBraid refunds a
cancelled job (D10).

One narrow gap stays. If the job completes between the last poll and the
cancel, the cancel fails, qBraid charges the job, and the run still
ends in TIMEOUT with no bill. The window is one poll interval at the end
of a 30-minute run.
