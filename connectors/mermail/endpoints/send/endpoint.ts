import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMailboxPath, zOutboundBody } from "../../schema/common.ts";

/**
 * `POST /api/v1/mailboxes/{mailboxId}/emails` — new outbound message.
 * Returns 202. Flat 5 credits (email_send).
 *
 * Catalog id is `/emails/send` because the wire path is shared with
 * list (`GET` the same URL).
 */
export default defineEndpoint({
    meta: {
        displayName: "Send Mermail email",
        summary: "Send a new message from a mailbox.",
        description: "Sends a new message from the mailbox. Provide html " +
            "and/or text, plus to, from, and subject. Returns 202 with " +
            "{id, status}. status sent means Mermail accepted the send; " +
            "recipient delivery is a separate outcome. Do not retry " +
            "automatically. Free workspaces cap external recipients. To " +
            "answer an existing message, call " +
            "`mermail#mailboxes/{mailboxId}/emails/{emailId}/reply` " +
            "instead of starting a new thread. Attachments are base64 " +
            "bytes or an attachment_id from this mailbox, not a path or URL.",
        docsUrl: "https://docs.mermail.app/api-reference/overview",
        categories: ["email"],
        notes: [
            "5 Mermail API credits per accepted send.",
            "202 is success for billing. Do not replay the call.",
        ],
    },
    endpoint: "/mailboxes/{mailboxId}/emails/send",
    request: {
        method: "POST",
        path: "/api/v1/mailboxes/{mailboxId}/emails",
    },
    input: {
        schema: {
            pathParams: zMailboxPath,
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
