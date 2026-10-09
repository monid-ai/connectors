import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zActIdPathParams } from "../../schema/common.ts";

/**
 * `GET /us/statutes/section/{act_id}/cross-state`: the same provision
 * elsewhere.
 *
 * ANSWERED-OR-REFUNDED billing, which is why this is metered rather than
 * flat. Measured live 2026-09-17: a section with five equivalents billed 6,
 * the same 6 as one with three, so the price does not scale with states.
 * But a section with NO equivalents returned 200 and billed 0.
 *
 * A flat `PER_CALL` cannot express that second half. A zero claim prunes to
 * an empty claim, an empty claim falls back to the derived fold, and a flat
 * fold would then bill the full 6 for a call the vendor refunded. So the
 * billable quantity is "an answer delivered", counted 1 or 0, which is a COUNTING
 * rule owned by the fns, never a model shape (design D19).
 */
export default defineEndpoint({
    meta: {
        displayName: "Compare a Provision Across States",
        summary: "The equivalent provision in other states.",
        description: "Find the provision that does the same job in other " +
            "states: one section per state, matched on what the provision " +
            "does rather than on its citation. This is the fifty-state " +
            "survey question asked directly, instead of running fifty " +
            "searches and guessing at each state's vocabulary for the same " +
            "rule. Returns which states were covered alongside the " +
            "matches. Priced the same whether it finds three states or " +
            "twenty; a section with no equivalents at all is refunded.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/compare-this-provision-against-other-states",
        categories: ["legal-research"],
    },
    request: {
        method: "GET",
        path: "/us/statutes/section/{act_id}/cross-state",
    },
    input: {
        schema: {
            pathParams: zActIdPathParams,
            queryParams: z.object({
                limit: z.number().int().min(1).max(25).describe(
                    "Maximum states to return, one provision each. It caps " +
                        "the answer, not the price.",
                ).optional(),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 6 },
            label: "answered comparison",
            description: "one per call that returns at least one equivalent " +
                "provision, whatever the number of states; a call that " +
                "finds none is refunded",
        },
        /** A pre-run promise cannot know whether the corpus holds an
         *  equivalent, so it quotes the list price. A miss settles BELOW
         *  this, never above. */
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const found = utils.json.optionalLen(data.output, "$.neighbors") ??
                0;
            return { counts: { RESULT: found > 0 ? 1 : 0 } };
        },
    },
});
