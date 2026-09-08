import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zExaContentsBody } from "./schema/inputs.ts";

/**
 * Exa /contents — clean page content for known URLs.
 *
 * Plain per-result metering (no base fee — unlike /search's
 * base-plus-overage): a leaf PER_UNIT doc, counts keyed by the model's
 * unit (design D19).
 */
export default defineEndpoint({
    meta: {
        displayName: "Exa Contents",
        summary: "Fetch clean, LLM-ready content for a list of URLs.",
        description: "Fetch clean, LLM-ready content for a list of URLs. " +
            "Returns full page text, key highlights, LLM-generated summaries, " +
            "and metadata for each URL — handles JavaScript-rendered pages, " +
            "PDFs, and complex layouts. Supports subpage crawling ('subpages' " +
            "+ 'subpageTarget') and cache freshness control via 'maxAgeHours'. " +
            "Use this when you already know the URLs; start from /search if " +
            "you don't.",
        docsUrl: "https://exa.ai/docs/reference/get-contents",
        categories: ["web-scraping"],
    },
    request: { method: "POST", path: "/contents" },
    input: {
        schema: { body: zExaContentsBody },
    },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        consolidate: ({ data, utils }) => {
            const total = utils.json.optionalNum(
                data.output,
                "$.costDollars.total",
            );
            return {
                usage: {
                    counts: {
                        "RESULT": utils.json.len(data.output, "$.results"),
                    },
                    ...(total !== undefined
                        ? { cost: utils.money.fromDollars(total) }
                        : {}),
                    evidence: utils.json.pick(data.output, [
                        "$.costDollars",
                        "$.requestId",
                    ]),
                },
                output: utils.json.omit(data.output, ["costDollars"]),
            };
        },
    },
});
