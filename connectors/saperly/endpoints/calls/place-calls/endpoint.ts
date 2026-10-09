import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zE164, zNumberId } from "../../../schema/common.ts";
import {
    callConsolidate,
    callEstimate,
    callEvidence,
    pollCallRun,
    stopCallRun,
} from "../../../schema/call-lifecycle.ts";

/**
 * /place-calls — THE metered async endpoint (v1 `calls/place-call.ts`):
 * the RUN is the call. It stays RUNNING for the life of the call,
 * completes with duration + cost when the carrier finalizes, and STOPPING
 * the run IS the hangup (stop settles the metered work — design D34).
 * The hold GROWS with the call: the shared estimate re-runs every 30 s
 * (usage.updateEstimateEveryMs — design D40), so a call can never outrun
 * its hold by more than one cadence tick.
 *
 * USES binding: `fromNumberId` must be a number THIS workspace owns —
 * the engine pre-gates (uniform 404 for foreign ids, upstream never
 * touched) and a success settle marks the number for reconcile.
 */
export const zPlaceCallBody = z.object({
    fromNumberId: zNumberId.describe(
        "The id of a phone number YOU OWN to place the call from " +
            "(from /provision-numbers or /list-numbers).",
    ),
    to: zE164.describe(
        'The destination phone number in E.164 format, e.g. "+14155550123".',
    ),
    instructions: z.string().min(1).max(10_000).optional().describe(
        "Optional per-call system prompt — overrides the number's saved " +
            "persona instructions for THIS call only.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Place Outbound Call",
        summary:
            "Place an outbound AI phone call from your number; the RUN is the call — stop the run to hang up.",
        description:
            "Place an outbound call from a number you own. The number's " +
            "AI persona speaks on the call (inline 'instructions' " +
            "override it per call). The RUN is the call: it stays " +
            "RUNNING while the call is live; stop the run to hang up. " +
            "Recipients can opt out any time; calls to opted-out " +
            "recipients are blocked upstream (RecipientOptedOut, 403, " +
            "no charge).",
        docsUrl: "https://saperly.com/docs/guides/voice",
        categories: ["agentic-phone"],
        notes: [
            "Billing is per SECOND pro-rata; an unanswered call bills " +
            "nothing (ring time never bills).",
            "A live call accrues cost continuously — the estimate " +
            "re-prices on a 30-second clock while the run is RUNNING.",
        ],
    },
    endpoint: "/place-calls",
    request: { method: "POST", path: "/calls" },
    input: { schema: { body: zPlaceCallBody } },
    timeouts: {
        requestMs: 30_000,
        pollMs: 5_000,
        // safety net — a call should never legitimately run this long
        runMs: 4 * 60 * 60 * 1000,
    },
    resources: {
        uses: [{
            id: "saperly/phone-number",
            key: "$.body.fromNumberId",
        }],
    },
    usage: {
        /** $0.28 per 60 seconds keeps the per-minute carrier-derived rate
         *  EXACT (vs a rounded per-second amount); billing is still by
         *  the SECOND — the fold is ceil(seconds/60) × $0.28. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.SECOND,
            every: 60,
            label: "call time",
            consumes: { credit: "default", amount: 0.28 },
        },
        estimate: callEstimate,
        /** re-price the hold every 30 s while the call is live. */
        updateEstimateEveryMs: 30_000,
        evidence: callEvidence,
        consolidate: callConsolidate,
    },
    lifecycle: {
        // NO typed `state` schema: the graceLeft bag belongs to the SHARED
        // poll/stop fns (schema/call-lifecycle.ts), which are typed
        // against the untyped core ctx so one fn VALUE serves both call
        // endpoints (content-deduped to one fnTable entry).
        /**
         * START: `POST /calls` with a run-stable idempotency key. Non-2xx
         * relays as data (COMPLETED, uncharged); a 2xx with no readable
         * call id is OUR 502 (unmanageable); a born-terminal record
         * completes at once; else RUNNING with the callId as
         * externalRunId — the webhook/signal join key, VERBATIM.
         */
        start: async ({ data, utils }) => {
            const $ = utils.json;
            const body = data.input.body!;
            const res = await utils.http({
                method: "POST",
                path: "/calls",
                headers: { "Idempotency-Key": data.run.runId + ":call" },
                body: {
                    fromNumberId: body.fromNumberId,
                    to: body.to,
                    ...(body.instructions !== undefined
                        ? { instructions: body.instructions }
                        : {}),
                },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const callId = $.optionalStr(res.body, "$.id");
            if (callId === undefined) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: {
                        code: "malformed_call",
                        message:
                            "Saperly returned success but no readable call id",
                    },
                };
            }
            const status = ($.optionalStr(res.body, "$.status") ?? "")
                .toLowerCase();
            const terminal =
                $.optionalNum(res.body, "$.costCents") !== undefined || [
                    "completed",
                    "ended",
                    "failed",
                    "busy",
                    "no-answer",
                    "no_answer",
                    "canceled",
                    "cancelled",
                ].includes(status);
            if (terminal) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                    state: { externalRunId: callId },
                };
            }
            return { kind: "RUNNING", state: { externalRunId: callId } };
        },
        poll: pollCallRun,
        stop: stopCallRun,
    },
});
