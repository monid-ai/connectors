import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSubmitJobBody } from "./schema/inputs.ts";

/**
 * `POST /jobs` — THE billable endpoint of the connector, run as an ASYNC
 * job (design D9): submit, poll to a terminal status, read the result, all
 * inside one run. The job QRN lives in `state.externalRunId` and never
 * reaches the caller — Monid holds ONE qBraid key, qBraid QRNs are
 * guessable, so a QRN-addressed read or cancel would reach other callers'
 * jobs. The output allowlists the job's fields, so `jobQrn` stays
 * inside too.
 *
 *   start → `POST /jobs`            RUNNING{externalRunId: jobQrn}
 *   poll  → `GET  /jobs/{qrn}`      RUNNING until COMPLETED/FAILED/CANCELLED
 *           `GET  /jobs/{qrn}/result` on COMPLETED → `{job, result}`
 *   stop  → `POST /jobs/{qrn}/cancel` best effort
 *
 * Terminal statuses are qbraid-api's `QuantumJobStatusReturned`
 * (job/shared/types.ts): COMPLETED, FAILED, CANCELLED. Everything else —
 * INITIALIZING, QUEUED, VALIDATING, RUNNING, CANCELLING, HOLD, UNKNOWN, or
 * a status we do not know — stays RUNNING, bounded by `runMs`. Reading a
 * non-terminal job is also what makes qbraid-api refresh it from the
 * device vendor, so the poll drives the job forward.
 *
 * BILLING (design D10): settle on the terminal `job.cost` — the FINAL
 * charge. qBraid escrows `estimatedCost` at submit and settles `cost` at the
 * terminal status (worker-service escrow-settle: COMPLETED charges `cost`,
 * FAILED/CANCELLED refund the whole escrow). Counted in MILLIONTHS of a
 * credit because qBraid rounds credits to 6 decimals and the engine ceils
 * each line: `round(cost × 1e6)` at `amount: 0.000001` folds exactly.
 * FAILED/CANCELLED runs settle as synthesized 500s, which the engine
 * zero-bills — matching qBraid's full refund.
 *
 * Poll errors THROW (the kling D7 posture): a failed status GET says
 * nothing about the job, which may still be running and billing on a QPU.
 * The host retries the tick; `runMs` bounds it, and on expiry the engine
 * calls `stop` (cancel) before it fails the run with TIMEOUT.
 */
export default defineEndpoint({
    meta: {
        displayName: "Run Quantum Job",
        summary: "Run a program on a QPU or simulator and return its " +
            "measurement results — spends qBraid credits.",
        description: "Run a quantum program on a quantum device or " +
            "simulator and wait for its measurement results. THIS SPENDS " +
            "qBraid CREDITS: the job's final cost (scaling with shots and " +
            "the device's perTask / perShot / perMinute pricing; 100 " +
            "credits = $1 USD) is this run's usage. Call " +
            "qbraid#estimate-job-cost with the same deviceQrn and shots " +
            "first and confirm the number with the user. The free " +
            "simulator qbraid:qbraid:sim:qir-sv returns in seconds; a QPU " +
            "job waits in the device's queue, and a queue longer than 30 " +
            "minutes ends the run and cancels the job. program is " +
            "{format, data}: format must be one of the device's " +
            "runInputTypes from qbraid#get-device (qasm2, qasm3, quil, " +
            "qir.ll, ionq.circuit.v0, …) and data the program source; an " +
            "array of programs submits one batch job of up to 2000 " +
            "circuits. Validate OpenQASM with qbraid#validate-qasm first — " +
            "a malformed program wastes queue time — and preview circuits " +
            "of up to 20 qubits for free with qbraid#simulate-circuit. " +
            "Returns {job, result}: job is the finished job (status, " +
            "shots, estimatedCost, timeStamps, device) and result carries " +
            "resultData.measurementCounts, the histogram over bitstrings. " +
            "A submission the platform rejects (device not found, " +
            "insufficient credits, unsupported format), or a job that " +
            "fails or is cancelled, settles as a provider error carrying " +
            "the job's statusMsg and bills nothing. Suited to simple " +
            "circuits — Bell, GHZ, small Grover — or when the user " +
            "supplies program code directly; circuits that need Python " +
            "generation belong in the qBraid SDK.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
        notes: [
            "The usage estimate is always 0: the price depends on the " +
            "device's rate card, which the input alone cannot yield. " +
            "qbraid#estimate-job-cost is the quote.",
            "A run lasts at most 30 minutes. A job still queued or running " +
            "then is cancelled upstream and the run fails with a timeout; " +
            "qBraid refunds cancelled jobs.",
        ],
    },
    endpoint: "/submit-job",
    request: { method: "POST", path: "/jobs" },
    input: {
        schema: {
            // Every Monid caller shares one qBraid key, so a caller-supplied
            // group QRN could attach jobs to another caller's group (QRNs are
            // guessable). The binding omits it, and `.strict()` rejects any
            // unknown key before the wire so it cannot ride through either.
            body: zSubmitJobBody.omit({ groupJobQrn: true }).strict(),
        },
    },
    timeouts: { requestMs: 60_000, runMs: 1_800_000, pollMs: 5_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 0.000001 },
            label: "job cost",
            description: "the finished job's cost, counted in millionths " +
                "of a qBraid credit (qBraid rounds credits to 6 decimals)",
        },
        /** Not deducible from the input (see the file comment). */
        estimate: () => ({ counts: {} }),
        /** The final cost restated as the metered quantity — settle-side
         *  twin of the (empty) estimate. Absent field ⇒ no count. */
        evidence: ({ data, utils }) => {
            const cost = utils.json.optionalGet(data.output, "$.job.cost");
            return {
                counts: {
                    ...(typeof cost === "number"
                        ? { CREDIT: Math.round(cost * 1_000_000) }
                        : {}),
                },
            };
        },
        /** The vendor's OWN charge (design D27), plucked out of the payload
         *  — the receipt lives in usage.credits, not twice. The result
         *  route repeats it as a decimal string ("0E-33"); that copy leaves
         *  too. Zero claims prune (the free simulator bills nothing). */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.job.cost",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: utils.json.pluck(rest, "$.result.cost").rest,
            };
        },
    },
    lifecycle: {
        start: async ({ utils, logger }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            // 201 + success:false = rejected submission (qbraid-api
            // createJob answers 201 regardless). Nothing was queued; the
            // synthesized 502 keeps it out of the billing gate.
            const jobQrn = utils.json.optionalGet(res.body, "$.data.jobQrn");
            if (
                utils.json.optionalGet(res.body, "$.success") !== true ||
                typeof jobQrn !== "string" || jobQrn === ""
            ) {
                logger.warn(
                    "qbraid 2xx without success:true — synthesizing 502",
                    { status: res.status },
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return { kind: "RUNNING", state: { externalRunId: jobQrn } };
        },
        poll: async ({ data, utils, logger }) => {
            const qrn = data.lifecycle.state.externalRunId;
            if (qrn === undefined) {
                throw Object.assign(
                    new Error("qbraid poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const jobUrl = data.request.url + "/" + encodeURIComponent(qrn);
            const res = await utils.http({ method: "GET", url: jobUrl });
            if (
                res.status < 200 || res.status >= 300 ||
                utils.json.optionalGet(res.body, "$.success") !== true
            ) {
                // our status READ failed, not the job — it may still be
                // running on a device. Retriable; runMs bounds it.
                throw new Error(
                    "qBraid job read returned " + String(res.status),
                );
            }
            // ALLOWLIST the job facts a caller acts on. Withheld: jobQrn
            // (the handle this doc keeps private) and qbraid-api's four
            // SDK-contract fields — our account's Mongo ids and a storage
            // path that embeds the QRN.
            const job = utils.json.pick(
                utils.json.get(res.body, "$.data"),
                [
                    "$.name",
                    "$.status",
                    "$.statusMsg",
                    "$.shots",
                    "$.numCircuits",
                    "$.cost",
                    "$.estimatedCost",
                    "$.experimentType",
                    "$.queuePosition",
                    "$.vendor",
                    "$.provider",
                    "$.deviceQrn",
                    "$.device",
                    "$.tags",
                    "$.runtimeOptions",
                    "$.createdAt",
                    "$.updatedAt",
                    "$.timeStamps",
                ],
            );
            const status = utils.json.optionalGet(job, "$.status");
            if (status === "FAILED" || status === "CANCELLED") {
                const statusMsg = utils.json.optionalGet(job, "$.statusMsg");
                logger.warn("qbraid job did not complete", {
                    status: String(status),
                });
                // shaped like qBraid's own error envelope so the provider
                // fromError digests message + code
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: res.status,
                    output: {
                        success: false,
                        message: typeof statusMsg === "string" &&
                                statusMsg !== ""
                            ? statusMsg
                            : "qBraid job " + String(status),
                        error: { code: "JOB_" + String(status) },
                        job,
                    },
                };
            }
            if (status !== "COMPLETED") {
                return {
                    kind: "RUNNING",
                    state: {
                        externalRunId: qrn,
                        ...(typeof status === "string"
                            ? { stage: status }
                            : {}),
                    },
                };
            }
            const result = await utils.http({
                method: "GET",
                url: jobUrl + "/result",
            });
            if (
                result.status < 200 || result.status >= 300 ||
                utils.json.optionalGet(result.body, "$.success") !== true
            ) {
                // the job finished but its result is not readable yet —
                // retry the tick rather than ship a job without results
                throw new Error(
                    "qBraid job result read returned " + String(result.status),
                );
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                providerHttpStatus: result.status,
                output: utils.json.merge({ job }, {
                    result: utils.json.get(result.body, "$.data"),
                }),
            };
        },
        stop: async ({ data, utils, logger }) => {
            const qrn = data.lifecycle.state.externalRunId;
            if (qrn === undefined) {
                throw Object.assign(
                    new Error("qbraid stop without externalRunId in state"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "POST",
                url: data.request.url + "/" + encodeURIComponent(qrn) +
                    "/cancel",
            });
            if (res.status < 200 || res.status >= 300) {
                // best effort: 409 JOB_CANCEL_CONFLICT (still initializing)
                // or an already-terminal job leaves nothing to stop
                logger.warn("qbraid job cancel failed (ignored)", {
                    status: res.status,
                });
            }
        },
    },
});
