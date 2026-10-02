import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMailboxPath } from "../../schema/common.ts";

/**
 * `GET /api/v1/mailboxes/{mailboxId}` — one mailbox. Flat 1 credit.
 * Unread counts are only on the list endpoint.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Mermail mailbox",
        summary: "Fetch one mailbox by public_id, alias id, or email.",
        description: "Returns one mailbox: address, name, receiving " +
            "status, and whether it can receive. Does not include unread " +
            "counts — those are on `mermail#mailboxes`. A disabled mailbox " +
            "has disabled_at set and should not be reused. Then list mail " +
            "with `mermail#mailboxes/{mailboxId}/emails` or search with " +
            "`mermail#mailboxes/{mailboxId}/search`.",
        docsUrl: "https://docs.mermail.app/api-reference/overview",
        categories: ["email"],
        notes: ["1 Mermail API credit per call."],
    },
    endpoint: "/mailboxes/{mailboxId}",
    request: { method: "GET", path: "/api/v1/mailboxes/{mailboxId}" },
    input: { schema: { pathParams: zMailboxPath } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "mailbox reads",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
