import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEmailPath, zOutboundBody } from "../../schema/common.ts";

/**
 * `POST .../emails/{emailId}/forward` — forward one message.
 * Returns 202. Flat 5 credits.
 */
export default defineEndpoint({
    meta: {
        displayName: "Forward Mermail email",
        summary: "Forward one message to new recipients.",
        description: "Forwards an existing message. Provide the new to, " +
            "from, and subject, plus html and/or text. Returns 202 with " +
            "{id, status}. status sent means the forward was accepted; " +
            "delivery is separate. Do not retry automatically. To stay " +
            "on the original thread, call " +
            "`mermail#mailboxes/{mailboxId}/emails/{emailId}/reply`.",
        docsUrl: "https://docs.mermail.app/api-reference/overview",
        categories: ["email"],
        notes: [
            "5 Mermail API credits per accepted forward.",
            "202 is success for billing. Do not replay the call.",
        ],
    },
    endpoint: "/mailboxes/{mailboxId}/emails/{emailId}/forward",
    request: {
        method: "POST",
        path: "/api/v1/mailboxes/{mailboxId}/emails/{emailId}/forward",
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
