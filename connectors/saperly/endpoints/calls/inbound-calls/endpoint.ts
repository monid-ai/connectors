import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import {
    callConsolidate,
    callEstimate,
    callEvidence,
    pollCallRun,
    stopCallRun,
} from "../../../schema/call-lifecycle.ts";

/**
 * /inbound-calls — webhook-invoked: the metered run tracking an INBOUND
 * call answered on a provisioned number (v1 `inbound/inbound-call.ts`).
 * Structural sibling of /place-calls with ONE difference: the call
 * ALREADY EXISTS (the caller started it), so start performs NO upstream
 * call — it ADOPTS the event-carried callId as externalRunId and goes
 * straight to RUNNING. From there the lifecycle IS /place-calls' — poll,
 * stop, evidence, consolidate, and estimate are the SAME fn values, so the
 * compiler interns ONE entry each (billing truth is provably the same
 * code either way).
 *
 * Dispatched by the number-events webhook (`call.received`, runKey =
 * callId so duplicate deliveries converge and later call.* signals find
 * this run; admit-overdraft — the call is already live upstream). Hosted
 * policy keeps it out of public catalogs.
 */
export const zInboundCallBody = z.object({
    callId: z.string().min(1).describe(
        "The Saperly call id from the inbound call event — the run " +
            "tracks and bills THIS call.",
    ),
    numberId: z.string().optional().describe(
        "The provisioned number that answered the call.",
    ),
    from: z.string().optional().describe("Caller (E.164)."),
    to: z.string().optional().describe("Receiving number (E.164)."),
    startedAt: z.string().optional().describe(
        "When the call started upstream (ISO timestamp).",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Inbound Call Answered",
        summary:
            "Track and bill an inbound call answered on a provisioned number (webhook-invoked).",
        description: "Webhook-invoked metered endpoint: the RUN tracking an " +
            "inbound call answered by one of your numbers' AI personas. " +
            "Started by the webhook pipeline when an inbound call event " +
            "arrives; it stays RUNNING for the life of the call, bills " +
            "per SECOND from the carrier-settled record, and stopping " +
            "the run hangs the call up.",
        docsUrl: "https://saperly.com/docs/guides/voice",
        categories: ["agentic-phone"],
        notes: [
            "Internal endpoint — started by the webhook pipeline on " +
            "inbound call events; hosts keep it out of public catalogs.",
        ],
    },
    endpoint: "/inbound-calls",
    /** The poll anchor — start never calls upstream (the call exists). */
    request: { method: "GET", path: "/calls/{id}" },
    input: {
        schema: { body: zInboundCallBody },
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                id: String(
                    (data.input.body as Record<string, unknown>).callId,
                ),
            },
        }),
    },
    timeouts: {
        requestMs: 30_000,
        pollMs: 5_000,
        runMs: 4 * 60 * 60 * 1000,
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.SECOND,
            every: 60,
            label: "call time",
            consumes: { credit: "default", amount: 0.28 },
        },
        estimate: callEstimate,
        updateEstimateEveryMs: 30_000,
        evidence: callEvidence,
        consolidate: callConsolidate,
    },
    lifecycle: {
        // NO typed `state` schema — see place-calls (shared-fn dedupe).
        /** LOCAL adopt — the event-carried callId becomes the run's
         *  externalRunId; the shared poll loop takes it from there. */
        // deno-lint-ignore require-await
        start: async ({ data }) => ({
            kind: "RUNNING",
            state: {
                externalRunId: String(
                    (data.input.body as Record<string, unknown>).callId,
                ),
            },
        }),
        poll: pollCallRun,
        stop: stopCallRun,
    },
});
