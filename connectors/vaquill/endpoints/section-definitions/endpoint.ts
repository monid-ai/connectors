import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zActIdPathParams } from "../../schema/common.ts";

/**
 * `GET /us/statutes/section/{act_id}/definitions`: the terms that govern.
 *
 * ANSWERED-OR-REFUNDED, the same shape as `#cross-state`. Measured live
 * 2026-09-17: 48 terms billed 4 and 4 terms billed 4, so the price does not
 * scale with terms. But a section whose chapter carries no definitions at
 * all returned 200 and billed 0. Counted 1 or 0 rather than modelled flat,
 * because a flat fold would bill 4 for a call the vendor refunded.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Defined Terms",
        summary: "The term definitions that govern a section.",
        description: "The defined terms that govern a section, parsed out " +
            "of its chapter's own definitions section and returned with " +
            "the marker each one sits under. A statute's terms of art mean " +
            "what the statute says they mean, not what they mean in " +
            "ordinary use, so reading a provision without its definitions " +
            "is how a confident wrong answer gets made. Returns the " +
            "definitions section it drew from alongside the terms. Priced " +
            "the same for four terms or forty; a section whose chapter " +
            "defines nothing is refunded.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/get-the-defined-terms-that-govern-this-section",
        categories: ["legal-research"],
    },
    request: {
        method: "GET",
        path: "/us/statutes/section/{act_id}/definitions",
    },
    input: { schema: { pathParams: zActIdPathParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 4 },
            label: "answered lookup",
            description:
                "one per call that returns at least one defined term, " +
                "whatever the number of terms; a call that finds none is " +
                "refunded",
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const terms = utils.json.optionalLen(data.output, "$.terms") ?? 0;
            return { counts: { RESULT: terms > 0 ? 1 : 0 } };
        },
    },
});
