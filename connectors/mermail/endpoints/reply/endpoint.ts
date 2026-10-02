import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEmailPath, zOutboundBody } from "../../schema/common.ts";

/**
 * `POST .../emails/{emailId}/reply` — reply on the original thread.
 * Returns 202. Flat 5 credits.
 */
export default defineEndpoint({
    meta: {
        displayName: "Reply to Mermail email",
        summary: "Reply to one message on its existing thread.",
        description: "Sends a reply. The server sets in_reply_to, " +
            "references, and thread_id from the original message. Provide " +
            "html and/or text, plus to, from, and subject. Returns 202 " +
            "with {id, status}. status sent means the reply was accepted; " +
            "delivery is separate. Do not retry automatically. Read the " +
            "thread first with " +
            "`mermail#mailboxes/{mailboxId}/emails/{emailId}/context`. " +
            "To send to someone else, call " +
            "`mermail#mailboxes/{mailboxId}/emails/{emailId}/forward`.",
        docsUrl: "https://docs.mermail.app/api-reference/overview",
        categories: ["email"],
        notes: [
            "5 Mermail API credits per accepted reply.",
            "202 is success for billing. Do not replay the call.",
        ],
    },
    endpoint: "/mailboxes/{mailboxId}/emails/{emailId}/reply",
    request: {
        method: "POST",
        path: "/api/v1/mailboxes/{mailboxId}/emails/{emailId}/reply",
    },
    input: {
        schema: {
            pathParams: zEmailPath,
            body: zOutboundBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "email sends",
            consumes: { credit: "default", amount: 5 },
        },
    },
});
