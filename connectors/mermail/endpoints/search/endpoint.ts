import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zMailboxPath } from "../../schema/common.ts";
import { zSearchEmailsQuery } from "./schema/inputs.ts";

/**
 * `GET /api/v1/mailboxes/{mailboxId}/search` — mailbox search.
 * Flat 1 credit. Not web search.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Mermail emails",
        summary: "Search one mailbox by text, sender, subject, or date.",
        description: "Searches messages inside one mailbox and returns " +
            "{emails, totalCount}. query matches subject, body, sender, " +
            "and recipients. from, to, and subject are substring filters — " +
            "re-check the address on the selected message before you " +
            "send. This does not search the web. Open a hit with " +
            "`mermail#mailboxes/{mailboxId}/emails/{emailId}` or its " +
            "thread with " +
            "`mermail#mailboxes/{mailboxId}/emails/{emailId}/context`. " +
            "Use `mermail#mailboxes/{mailboxId}/emails` when you want a " +
            "folder page instead of a query.",
        docsUrl: "https://docs.mermail.app/api-reference/overview",
        categories: ["email"],
        notes: ["1 Mermail API credit per call, including no hits."],
    },
    endpoint: "/mailboxes/{mailboxId}/search",
    request: {
        method: "GET",
        path: "/api/v1/mailboxes/{mailboxId}/search",
    },
    input: {
        schema: {
            pathParams: zMailboxPath,
            queryParams: zSearchEmailsQuery,
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
