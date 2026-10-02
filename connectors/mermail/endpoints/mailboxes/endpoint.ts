import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zListMailboxesQuery } from "./schema/inputs.ts";

/**
 * `GET /api/v1/mailboxes` — mailboxes on the API key's workspace.
 * Flat 1 credit (read).
 */
export default defineEndpoint({
    meta: {
        displayName: "List Mermail mailboxes",
        summary: "List mailboxes the API key can use.",
        description: "Lists every mailbox on the API key's workspace, " +
            "including email, public_id, receiving status, and unread " +
            "counts by category. Use public_id as mailboxId on later " +
            "calls. A supplied workspaceId must match the key or the " +
            "call returns 403. To provision an address, call " +
            "`mermail#mailboxes/create`. To read mail, call " +
            "`mermail#mailboxes/{mailboxId}/emails` or " +
            "`mermail#mailboxes/{mailboxId}/search`.",
        docsUrl: "https://docs.mermail.app/api-reference/overview",
        categories: ["email"],
        notes: ["1 Mermail API credit per call."],
    },
    endpoint: "/mailboxes",
    request: { method: "GET", path: "/api/v1/mailboxes" },
    input: { schema: { queryParams: zListMailboxesQuery } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "mailbox reads",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
