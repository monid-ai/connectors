import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zListEmailsQuery } from "./schema/inputs.ts";
import { zMailboxPath } from "../../schema/common.ts";

/**
 * `GET /api/v1/mailboxes/{mailboxId}/emails` — one page of messages.
 * Flat 1 credit (read).
 */
export default defineEndpoint({
    meta: {
        displayName: "List Mermail emails",
        summary: "List messages in a mailbox, with safe-read filters.",
        description: "Lists messages in a mailbox as {emails, totalCount}. " +
            "For an agent, set metadata_only, agent_safe_content, and " +
            "require_scan_status to clean before you trust a body. " +
            "include_held is only for a scoped verification flow. Page " +
            "size defaults to 25 (1–100). Open one row with " +
            "`mermail#mailboxes/{mailboxId}/emails/{emailId}`, or the " +
            "bounded thread with " +
            "`mermail#mailboxes/{mailboxId}/emails/{emailId}/context`. " +
            "When you have a sender, subject, or time window, search " +
            "instead: `mermail#mailboxes/{mailboxId}/search`.",
        docsUrl: "https://docs.mermail.app/api-reference/overview",
        categories: ["email"],
        notes: ["1 Mermail API credit per call, including an empty page."],
    },
    endpoint: "/mailboxes/{mailboxId}/emails",
    request: {
        method: "GET",
        path: "/api/v1/mailboxes/{mailboxId}/emails",
    },
    input: {
        schema: {
            pathParams: zMailboxPath,
            queryParams: zListEmailsQuery,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "email reads",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
