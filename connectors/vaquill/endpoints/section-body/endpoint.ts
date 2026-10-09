import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zActIdPathParams } from "../../schema/common.ts";
import { zSectionBodyQueryParams } from "./schema/inputs.ts";

/**
 * `GET /us/statutes/section/{act_id}/body`: the section's full text.
 *
 * 6 credits whatever the length, and the same 6 whether or not `asOf`
 * sends it through the point-in-time reconstruction. This is the same line
 * that `includeBody` adds per row on search and on the batch lookup.
 *
 * TEXT-OR-FREE billing, which is why this is metered rather than flat. An
 * `asOf` date outside the held editions answers 200 with `available: false`
 * and every text field null, and the vendor still charges the 6 (verified
 * live 2026-09-18). The caller pays nothing for that answer; the broker
 * absorbs it. A flat `PER_CALL` folds to 6 regardless, so the billable
 * quantity is "text delivered", counted 1 or 0, and the endpoint's own
 * `consolidate` declines the vendor's claim when no text was served.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get US Statute Full Text",
        summary: "Full text of one statute section, optionally as of a date.",
        description: "The operative text of a section, as published. " +
            "`format` picks the representation (plain text, the " +
            "publisher's HTML, the section without surrounding notes, or " +
            "the enacted text alone) and `structured` adds a parsed " +
            "subsection tree so a pincite can be addressed directly. " +
            "`asOf` reconstructs the text as it stood on a past date, " +
            "which is what you want when reading a contract or a filing " +
            "against the law in force at the time rather than today's. " +
            "The response carries the source URL and publisher credit " +
            "alongside the text.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/get-statute-full-text",
        categories: ["legal-research"],
        notes: [
            "Read `asOf.engine` before trusting `asOf.isBounded`, because " +
            "the flag means a different thing under each engine. Under " +
            "`stored_edition` the answer comes from published editions " +
            "served verbatim, and a date before the earliest edition, or " +
            "between two of them, is reported out of coverage rather than " +
            "interpolated from a neighbour. Under `observed_change` the " +
            "text is rebuilt from the before-side of the first change we " +
            "observed after your date, so `isBounded: true` means only " +
            "that no affecting change was observed, which is weaker than " +
            "there having been none.",
        ],
    },
    request: { method: "GET", path: "/us/statutes/section/{act_id}/body" },
    input: {
        schema: {
            pathParams: zActIdPathParams,
            queryParams: zSectionBodyQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 6 },
            label: "section text",
            description: "one per call that serves the text; an `asOf` date " +
                "outside the held editions (`available: false`) is free",
        },
        /** A pre-run promise cannot know whether an edition covers the
         *  date, so it quotes the list price. A miss settles BELOW this,
         *  never above. */
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const available = utils.json.optionalGet(
                data.output,
                "$.available",
            );
            return { counts: { RESULT: available === false ? 0 : 1 } };
        },
        /** The provider-wide receipt strip, with one difference: when the
         *  vendor served no text (`available: false`) its 6-credit claim is
         *  NOT adopted, so the derived fold settles at nothing. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.creditsConsumed",
            );
            const available = utils.json.optionalGet(
                data.output,
                "$.available",
            );
            return {
                credits: {
                    ...(typeof value === "number" && available !== false
                        ? { default: value }
                        : {}),
                },
                output: rest,
            };
        },
    },
});
