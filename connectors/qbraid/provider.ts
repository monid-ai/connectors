import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * qBraid (qbraid.com) — quantum computing platform API, JSON-over-HTTP at
 * `https://api-v2.qbraid.com/api/v1` with `X-API-Key: qbr_…`. Source of
 * truth for every shape here is the qbraid-api repo (Express + valibot):
 * request schemas from `src/features/{device,composer,job}/validators.ts`,
 * response shapes from the controllers and `job/shared/serializers/*`.
 *
 * Nine endpoints are FREE (device/provider reads, OpenQASM tooling, the
 * 20-qubit simulator, cost estimate) — the provider states FREE as the
 * default model. ONE endpoint bills: `#submit-job`, an async run that owns
 * the job from submit to result and carries its own model, settle fns and
 * lifecycle. There are no job-read or cancel endpoints: under one shared
 * API key a caller-supplied job QRN would reach any caller's job.
 *
 * Every response is an envelope: `{success: true, data}` (some routes add
 * `meta.timestamp`) or `{success: false, message, error: {code, …}}`.
 * Verified live 2026-09-22: 401 `INVALID_API_KEY_FORMAT` (garbage key),
 * `INVALID_API_KEY` (well-formed unknown key), `NO_VALID_AUTHENTICATION`
 * (missing key).
 */
export default defineProvider({
    name: "qbraid",
    meta: {
        displayName: "qBraid",
        summary: "Quantum devices, OpenQASM tooling, free simulation, and " +
            "paid QPU jobs.",
        description: "Cloud access to quantum computers and simulators " +
            "across AWS Braket, Azure Quantum, IBM, IonQ and qBraid's own " +
            "backends. List devices and their live calibration, validate, " +
            "parse, convert and simulate OpenQASM for free, price a run, " +
            "then run a job to its result in one call. Pay-as-you-go in " +
            "qBraid credits (100 credits = $1 USD).",
        homepageUrl: "https://www.qbraid.com",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
        notes: [
            "Every response is an envelope: {success: true, data} on " +
            "success, {success: false, message, error: {code}} on failure.",
            "QRNs (qBraid Resource Names) are colon-separated identifiers, " +
            "e.g. aws:aws:sim:sv1 or ibm:ibm:qpu:fez — pass them verbatim.",
        ],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://api-v2.qbraid.com/api/v1" },
    timeouts: { requestMs: 30_000, runMs: 60_000 },
    usage: {
        /** The default: nine of ten endpoints never bill. */
        model: { kind: UsageModelKind.FREE },
        /** THE credit system (design D26): qBraid meters in its own
         *  credits — 100 credits = $1 USD (qbraid-api
         *  `CREDITS_PER_DOLLAR = 100`, billing/ai-chat/ai-chat.types.ts).
         *  Declared once here, drained by `#submit-job` alone; every
         *  FREE doc narrows to no pool (D6). */
        credits: { default: { label: "qBraid credits" } },
    },
    output: {
        /** `{success: false, message, error: {code, …}}` — digest the
         *  message + machine code, keep the raw body (design D12). */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.message");
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "qBraid API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
