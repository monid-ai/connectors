import { defineEndpoint } from "@shared/core";
import { zGoogleShoppingScraperBody } from "./schema/inputs.ts";

/**
 * burbn/google-shopping-scraper — Search Google Shopping. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Shopping",
        summary: "Scrape Google Shopping products by keyword with " +
            "offer-level pricing and seller data.",
        description: "Scrapes Google Shopping product listings by keyword " +
            "with detailed offer-level data. Returns product titles, " +
            "descriptions, current and original prices, discounts, " +
            "ratings, review counts, seller metadata (name, rating, " +
            "shipping, returns), product media (photos and videos), " +
            "and variant/attribute data. Suited for price " +
            "comparison, competitor research, and multi-seller " +
            "analysis.",
        docsUrl: "https://apify.com/burbn/google-shopping-scraper",
        categories: ["google-shopping"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/burbn~google-shopping-scraper/runs",
    },
    input: { schema: { body: zGoogleShoppingScraperBody } },
});
