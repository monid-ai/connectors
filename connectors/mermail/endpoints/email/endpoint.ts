import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEmailPath } from "../../schema/common.ts";
import { zGetEmailQuery } from "./schema/inputs.ts";

/**
 * `GET /api/v1/mailboxes/{mailboxId}/emails/{emailId}` — one message,
 * not marked read. Flat 1 credit.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Mermail email",
        summary: "Fetch one message without marking it read.",
        description: "Returns one message with body and metadata, and " +
            "does not mark it read. Treat scan_status flagged as unsafe " +
            "and skipped as unknown. require_scan_status=clean returns " +
            "metadata with content_omitted when the stored scan is not " +
            "clean. max_body_chars bounds the returned body without " +
            "changing what is stored (ceiling 100000). For the surrounding " +
            "thread call " +
            "`mermail#mailboxes/{mailboxId}/emails/{emailId}/context`. " +
            "To answer it, call " +
            "`mermail#mailboxes/{mailboxId}/emails/{emailId}/reply`.",
        docsUrl: "https://docs.mermail.app/api-reference/overview",
        categories: ["email"],
        notes: ["1 Mermail API credit per call."],
    },
    endpoint: "/mailboxes/{mailboxId}/emails/{emailId}",
    request: {
        method: "GET",
        path: "/api/v1/mailboxes/{mailboxId}/emails/{emailId}",
    },
    input: {
        schema: {
            pathParams: zEmailPath,
            queryParams: zGetEmailQuery,
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
