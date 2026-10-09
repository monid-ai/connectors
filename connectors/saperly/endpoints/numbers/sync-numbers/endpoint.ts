import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zNumberId } from "../../../schema/common.ts";

/**
 * /sync-numbers — webhook-invoked maintenance: re-sync a provisioned
 * number from upstream after an out-of-band change (v1
 * `numbers/sync-numbers.ts`). The run is a thin DECLARATIVE
 * `GET /numbers/{id}` relay; the REAL effect is the UPDATES settle mark —
 * the host runs the resource doc's `refresh` op afterwards, so the stored
 * row converges on upstream truth without ever trusting the webhook
 * payload as state. Hosted policy keeps it internal (dispatched by the
 * number-events webhook only).
 */
export const zSyncNumberBody = z.object({
    numberId: zNumberId.describe("The Saperly number id to re-sync."),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Sync Phone Number",
        summary:
            "Re-sync a provisioned number from upstream (webhook-triggered).",
        description:
            "Webhook-invoked maintenance endpoint: re-reads one of your " +
            "numbers from the carrier; a success re-syncs the stored " +
            "resource copy (post-run refresh). Started by the webhook " +
            "pipeline on compliance/connection update events.",
        docsUrl: "https://saperly.com/docs/guides/numbers",
        categories: ["agentic-phone"],
        notes: [
            "Internal maintenance endpoint — started by the webhook " +
            "pipeline on number.* events; hosts keep it out of public " +
            "catalogs.",
        ],
    },
    endpoint: "/sync-numbers",
    request: { method: "GET", path: "/numbers/{id}" },
    input: {
        schema: { body: zSyncNumberBody },
        toRequest: ({ data }) => ({
            ...data.input,
            pathParams: {
                id: String(
                    (data.input.body as Record<string, unknown>).numberId,
                ),
            },
        }),
    },
    resources: {
        updates: [{
            id: "saperly/phone-number",
            key: "$.body.numberId",
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
