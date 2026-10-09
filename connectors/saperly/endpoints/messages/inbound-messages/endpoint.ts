import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * /inbound-messages — webhook-invoked: bill + record an inbound SMS (v1
 * `inbound/inbound-message.ts`). Execution is LOCAL: the verified webhook
 * event's summary (the run input) IS the output — the provider already
 * pushed the message; the run exists to CHARGE for it and give it a
 * durable record. Dispatched bill-only (the message ALREADY arrived —
 * blocking cannot un-receive it). Hosted policy keeps it internal.
 */
export const zInboundMessageBody = z.object({
    messageId: z.string().optional().describe(
        "The Saperly message id, when the event carried one.",
    ),
    numberId: z.string().optional().describe(
        "The provisioned number the message was received on.",
    ),
    from: z.string().optional().describe("Sender (E.164)."),
    to: z.string().optional().describe("Receiving number (E.164)."),
    body: z.string().optional().describe("The message text."),
    segments: z.number().optional().describe("Carrier-reported segments."),
    receivedAt: z.string().optional().describe(
        "When the event was created upstream (ISO timestamp).",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Inbound SMS Received",
        summary:
            "Bill and record an inbound SMS received on a provisioned number (webhook-invoked).",
        description:
            "Webhook-invoked billing endpoint: records and bills one " +
            "inbound SMS received on a number you own. Started by the " +
            "webhook pipeline; the run's output is the inbound message " +
            "summary (from, to, body, segments).",
        docsUrl: "https://saperly.com/docs/guides/messaging",
        categories: ["sms"],
        notes: [
            "Internal endpoint — started by the webhook pipeline when an " +
            "inbound SMS arrives; hosts keep it out of public catalogs.",
        ],
    },
    endpoint: "/inbound-messages",
    request: { method: "GET", path: "/messages" },
    input: { schema: { body: zInboundMessageBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "inbound message",
            consumes: { credit: "default", amount: 0.025 },
        },
    },
    lifecycle: {
        /** LOCAL completion — the event summary IS the output. */
        // deno-lint-ignore require-await
        start: async ({ data }) => ({
            kind: "COMPLETED",
            httpStatus: 200,
            output: data.input.body ?? {},
        }),
    },
});
