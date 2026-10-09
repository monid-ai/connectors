import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zActIdPathParams } from "../../schema/common.ts";

/**
 * `GET /us/statutes/section/{act_id}/related`: the sections on either side.
 *
 * Flat 2 credits however wide the window. `limit` is a display knob, not a
 * price knob, so it stays optional and keeps the vendor's default of 3.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Neighbouring Sections",
        summary: "The sections immediately before and after this one.",
        description: "The sections that sit either side of a given one " +
            "within its own chapter or code, in statutory order, plus the " +
            "container they all belong to. Statutes are drafted as a run " +
            "of related provisions, so the section next door is often the " +
            "definition, the exception or the penalty that changes how the " +
            "one you found reads. Costs the same whatever the window.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/get-the-sections-around-this-one",
        categories: ["legal-research"],
    },
    request: { method: "GET", path: "/us/statutes/section/{act_id}/related" },
    input: {
        schema: {
            pathParams: zActIdPathParams,
            queryParams: z.object({
                limit: z.number().int().min(1).max(10).describe(
                    "How many sections to return on EACH side.",
                ).optional(),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 2 },
        },
    },
});
