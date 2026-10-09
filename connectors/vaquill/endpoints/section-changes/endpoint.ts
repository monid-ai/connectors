import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zActIdPathParams } from "../../schema/common.ts";
import { zSectionChangesQueryParams } from "./schema/inputs.ts";

/**
 * `GET /us/statutes/section/{act_id}/changes`: what has moved, and when.
 *
 * 1 credit a page, which is what makes it usable as a poll: `sinceId`
 * turns it into a forward cursor a nightly job can walk.
 *
 * AN EMPTY PAGE IS FREE TO THE CALLER. The vendor charges the 1 whether or
 * not anything was observed (verified live 2026-09-18: an empty `changes`
 * answered 200 with `creditsConsumed: 1`); the broker absorbs it. A flat
 * `PER_CALL` folds to 1 regardless, so the billable quantity is "a page
 * with at least one observed change", counted 1 or 0, and the endpoint's
 * own `consolidate` declines the vendor's claim on an empty page.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Section Change History",
        summary: "What changed on a section, and when we observed it.",
        description: "The observed change history of one section: each " +
            "entry saying whether text was added, amended or removed, when " +
            "we saw it, and the window our observation covers. Cheap " +
            "enough to poll: pass the last `id` you processed as " +
            "`sinceId` and you get only what is new, which is the forward " +
            "cursor for keeping a local copy in step. Walk the other way " +
            "with `beforeId` to read a section's history backwards. Note " +
            "that these are dates we OBSERVED the change, which is not the " +
            "same as the date the legislature made it.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/get-this-sections-change-history",
        categories: ["legal-research"],
        notes: [
            "An empty `changes` list means no change observed within the " +
            "window the response reports as `observedFrom`, not that " +
            "the section has never been amended.",
        ],
    },
    request: { method: "GET", path: "/us/statutes/section/{act_id}/changes" },
    input: {
        schema: {
            pathParams: zActIdPathParams,
            queryParams: zSectionChangesQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 1 },
            label: "change page",
            description: "one per page that reports at least one observed " +
                "change; a page with nothing observed is free",
        },
        /** A pre-run promise cannot know whether anything was observed, so
         *  it quotes the list price. An empty page settles BELOW this,
         *  never above. */
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const found = utils.json.optionalLen(data.output, "$.changes") ??
                0;
            return { counts: { RESULT: found > 0 ? 1 : 0 } };
        },
        /** The provider-wide receipt strip, with one difference: on an empty
         *  page the vendor's 1-credit claim is NOT adopted, so the derived
         *  fold settles at nothing. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.creditsConsumed",
            );
            const found = utils.json.optionalLen(data.output, "$.changes") ??
                0;
            return {
                credits: {
                    ...(typeof value === "number" && found > 0
                        ? { default: value }
                        : {}),
                },
                output: rest,
            };
        },
    },
});
