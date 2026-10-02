import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCreateMailboxBody } from "./schema/inputs.ts";

/**
 * `POST /api/v1/mailboxes` — provision a mailbox. Returns 201.
 * Flat 10 credits (provision). Not a currency charge.
 */
export default defineEndpoint({
    meta: {
        displayName: "Create Mermail mailbox",
        summary: "Provision a mailbox and return its public_id.",
        description: "Creates a mailbox. email and name are required. " +
            "email must be a hosted @mermail.app address or an address on " +
            "a verified custom domain. Returns 201 with the mailbox, " +
            "including public_id — use that as mailboxId afterwards. A " +
            "successful create costs 10 API credits. This connector cannot " +
            "send Idempotency-Key; after a conflict or an uncertain " +
            "result, call `mermail#mailboxes` and match the normalized " +
            "address before creating again. Then read mail with " +
            "`mermail#mailboxes/{mailboxId}/emails`.",
        docsUrl: "https://docs.mermail.app/api-reference/overview",
        categories: ["email"],
        notes: [
            "10 Mermail API credits per successful create. Credits are " +
            "usage units, not dollars.",
            "Idempotency-Key is not exposed: headers on a connector " +
            "request are static.",
        ],
    },
    endpoint: "/mailboxes/create",
    request: { method: "POST", path: "/api/v1/mailboxes" },
    input: { schema: { body: zCreateMailboxBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "mailbox creates",
            consumes: { credit: "default", amount: 10 },
        },
    },
});
