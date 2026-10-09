import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zActIdPathParams } from "../../schema/common.ts";

/**
 * `GET /us/statutes/section/{act_id}/cited-by`: the inbound citations.
 *
 * ANSWERED-OR-REFUNDED, the same shape as `#cross-state` and
 * `#definitions`. Measured live 2026-09-17: five citers billed 2 and two
 * citers billed 2, but a section nothing cites returned 200 and billed 0.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Sections Citing This One",
        summary: "The sections whose text cross-references this one.",
        description: "The USC and CFR sections whose own text " +
            "cross-references a given section: the inverse of the " +
            "`crossReferences` already on a section lookup. This is how " +
            "you find the regulations that implement a statute, the " +
            "penalty provisions hanging off a definition, or everything " +
            "downstream of a section you are about to rely on. Priced the " +
            "same whatever the citer count; a section nothing cites is " +
            "refunded.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/find-the-sections-that-cite-this-one",
        categories: ["legal-research"],
    },
    request: { method: "GET", path: "/us/statutes/section/{act_id}/cited-by" },
    input: {
        schema: {
            pathParams: zActIdPathParams,
            queryParams: z.object({
                limit: z.number().int().min(1).max(100).describe(
                    "Maximum citing sections to return. It caps the " +
                        "answer, not the price.",
                ).optional(),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 2 },
            label: "answered lookup",
            description:
                "one per call that returns at least one citing section, " +
                "whatever the count; a call that finds none is refunded",
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const citers = utils.json.optionalLen(data.output, "$.citers") ?? 0;
            return { counts: { RESULT: citers > 0 ? 1 : 0 } };
        },
    },
});
