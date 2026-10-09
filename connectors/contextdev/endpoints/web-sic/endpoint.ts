import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSicQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "SIC Classification",
        summary:
            "Classify a brand into SIC codes (1987 original or the SEC's current list).",
        description: "Map any brand — by domain or by company title — onto " +
            "Standard Industrial Classification codes, returning ranked " +
            "codes with names and confidence. Choose the 1987 original " +
            "taxonomy (with major-group labels) or the current list " +
            "maintained by the SEC (with the responsible review office), " +
            "which is what filings, KYB, lending, and insurance workflows " +
            "usually key on. minResults/maxResults bound how many codes " +
            "come back (1-10) without changing the price.",
        docsUrl: "https://docs.context.dev/api-reference/web-extraction/sic",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/web/sic" },
    input: { schema: { queryParams: zSicQueryParams } },
    usage: {
        /** 10 credits per classification, however many codes —
         *  https://www.context.dev/pricing (2026-09-17). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "classifications",
            consumes: { credit: "default", amount: 10 },
        },
    },
});
