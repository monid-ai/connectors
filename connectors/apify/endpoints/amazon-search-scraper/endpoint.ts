import { defineEndpoint } from "@shared/core";
import { zAmazonSearchScraperBody } from "./schema/inputs.ts";

/**
 * axesso_data/amazon-search-scraper — Search Amazon. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
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
    request: {
        method: "POST",
        path: "/v2/acts/axesso_data~amazon-search-scraper/runs",
    },
    input: { schema: { body: zAmazonSearchScraperBody } },
});
