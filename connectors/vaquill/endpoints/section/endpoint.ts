import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zActIdPathParams } from "../../schema/common.ts";

/**
 * `GET /us/statutes/section/{act_id}`: one section's metadata.
 *
 * Flat 2 credits. Metadata only: the text lives behind
 * `vaquill#us/statutes/section/{act_id}/body`, which is priced separately
 * because it is the expensive half.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get US Statute Section",
        summary: "Metadata for one statute section.",
        description: "Everything about a section except its text: " +
            "citation, title, its place in the hierarchy, the publisher it " +
            "came from, its status (`in_force`, `repealed`, `renumbered` " +
            "and the rest), currency signals saying how fresh our copy is, " +
            "amendment history, effective dates, cross-references, and " +
            "links to the official source. Take the `actId` from a search " +
            "hit or the citation resolver. For the text itself call " +
            "`/body`; for several sections at once call " +
            "`/us/statutes/sections`, which is cheaper per section than " +
            "looping this one.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/get-statute-section-metadata",
        categories: ["legal-research"],
    },
    request: { method: "GET", path: "/us/statutes/section/{act_id}" },
    input: { schema: { pathParams: zActIdPathParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 2 },
        },
    },
});
