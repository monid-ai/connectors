import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAmazonSearchScraperBody } from "./schema/inputs.ts";

/**
 * axesso_data/amazon-search-scraper — Search Amazon. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Amazon",
        summary: "Extract real-time Amazon search results by keyword with " +
            "multi-page pagination.",
        description: "Extracts real-time Amazon search results by keyword " +
            "with multi-page pagination. Returns product titles, " +
            "pricing and discount info, product identifiers, star " +
            "ratings, review counts, images, availability, Prime " +
            "flags, descriptions, sponsored/organic flags, search " +
            "result positions, category hierarchies, and keyword " +
            "suggestions. Supports batch keyword processing, " +
            "marketplace targeting, category filtering, and sorting " +
            "options.",
        docsUrl: "https://apify.com/axesso_data/amazon-search-scraper",
        categories: ["amazon"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/axesso_data/amazon-search-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/axesso_data~amazon-search-scraper/runs",
    },
    input: { schema: { body: zAmazonSearchScraperBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // vendor charge event: "apify-default-dataset-item"
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.0001 },
        },
        /** One result per `input` entry — the actor keeps per-entry knobs
         *  opaque (z.any items), so the estimate counts at the granularity
         *  the mirror STATES: entries, never invented nested structure
         *  (design D25). */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.input.length },
        }),
    },
});
