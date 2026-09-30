import { defineEndpoint } from "@shared/core";
import { zDashaChatBody } from "./schema/inputs.ts";

/**
 * Dasha Compute chat completions — POST /compute/api/v1/chat/completions.
 *
 * FLAT-PER-CALL billing (the vendor's published card): $0.05 per
 * successful completion on a paid key, prepaid in USDC. No per-token
 * metering exists on the vendor side, so there is nothing to count here —
 * the engine appends the flat call and folds the pinned rate. A non-2xx
 * (402 top-up, 429 guest rate limit, 503 no Mac online) is data and
 * settles at zero, matching the vendor: failed calls are not charged.
 * Usage falls back to the provider model; the response passes through
 * untouched so the signed per-job receipt stays visible to the caller.
 */
export default defineEndpoint({
    meta: {
        displayName: "Dasha Compute Chat Completions",
        summary:
            "Run an OpenAI-style chat completion on community Macs — signed receipt included.",
        description:
            "Submit an OpenAI-compatible chat completion. The request is " +
            "routed to an online community Mac serving the model (or the " +
            "hosted floor model) and the call returns one JSON completion " +
            "when the job settles — it is not streaming: long completions " +
            "simply take longer. The response is the OpenAI shape plus " +
            "Dasha extensions: job_id, and for paid-key jobs a signed " +
            "receipt whose chain anyone can recompute. Reach for the " +
            "models endpoint first: available model ids are live state. " +
            "Errors are honest and specific — 402 'top up credits' (paid " +
            "key out of prepaid balance), 429 (guest key rate limited, " +
            "with Retry-After), 503 (no Mac online for that model).",
        docsUrl: "https://lobby.getdasha.com/compute/api",
        categories: ["llm-inference"],
        notes: [
            "Usage in the response is the worker-reported token count; " +
            "billing is flat per call, never per token.",
            "Uncertain response (timeout, lost body): treat each run as " +
            "a new paid call - this connector's input contract does not " +
            "forward custom headers, so the vendor's Idempotency-Key " +
            "retry header is not reachable through it. Verify before " +
            "re-posting rather than blind re-POSTs.",
        ],
    },
    endpoint: "/chat/completions",
    request: { method: "POST", path: "/api/v1/chat/completions" },
    input: {
        schema: { body: zDashaChatBody },
        // `stream` is not exposed; strip a pasted one as defense-in-depth
        // (SSE would not decode as one JSON envelope).
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.omit(data.input.body ?? {}, ["stream"]),
        }),
    },
});
