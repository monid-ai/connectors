import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zE164, zNumberId } from "../../../schema/common.ts";

/**
 * /send-messages — send an SMS from a number you own (v1
 * `messages/send-message.ts`). A pure DECLARATIVE relay: the engine
 * executes `POST /messages` itself; the USES binding pre-gates the
 * from-number's ownership. Flat PER_CALL — one send = one charge (long
 * texts split into segments upstream; the count rides as data only).
 */
export const zSendMessageBody = z.object({
    fromNumberId: zNumberId.describe(
        "The id of a phone number YOU OWN to send the SMS from " +
            "(from /provision-numbers or /list-numbers).",
    ),
    to: zE164.describe(
        'The recipient phone number in E.164 format, e.g. "+14155550123".',
    ),
    body: z.string().min(1).max(1600).describe(
        "The message text (1-1600 characters). Long messages split into " +
            "multiple segments automatically (one flat charge per send).",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Send SMS Message",
        summary:
            "Send an SMS from a phone number you own; opted-out recipients are blocked automatically.",
        description:
            "Send an SMS from one of YOUR numbers. Long texts split into " +
            "segments upstream (the response reports the count; one send " +
            "= one charge). Sends to opted-out recipients are blocked " +
            "automatically (RecipientOptedOut, 403, no charge).",
        docsUrl: "https://saperly.com/docs/guides/messaging",
        categories: ["sms"],
        notes: [
            "Running this SPENDS MONEY: $0.025 per send.",
        ],
    },
    endpoint: "/send-messages",
    request: { method: "POST", path: "/messages" },
    input: { schema: { body: zSendMessageBody } },
    resources: {
        uses: [{
            id: "saperly/phone-number",
            key: "$.body.fromNumberId",
        }],
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "message",
            consumes: { credit: "default", amount: 0.025 },
        },
    },
});
