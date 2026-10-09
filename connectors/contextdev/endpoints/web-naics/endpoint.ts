import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zNaicsQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "NAICS Classification",
        summary: "Classify a brand into 2022 NAICS industry codes.",
        description: "Map any brand — by domain or by company title — onto " +
            "the 2022 North American Industry Classification System, " +
            "returning ranked codes with their official names and a " +
            "confidence level. Use it for cleaner segmentation, routing, " +
            "analytics, underwriting, and compliance workflows that expect " +
            "government industry taxonomies rather than free-text " +
            "categories. minResults/maxResults bound how many codes come " +
            "back (1-10) without changing the price.",
        docsUrl: "https://docs.context.dev/api-reference/web-extraction/naics",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/web/naics" },
    input: { schema: { queryParams: zNaicsQueryParams } },
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
