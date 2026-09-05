import { defineEndpoint } from "@shared/core";
import { zAmazonProductDetailsScraperBody } from "./schema/inputs.ts";

/**
 * delicious_zebu/amazon-product-details-scraper — Get Amazon Product. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Amazon Product",
        summary: "Scrape full Amazon product detail pages by ASIN or " +
            "product URL.",
        description: "Scrapes Amazon product detail pages by ASIN or product " +
            "URL. Returns pricing, list prices, discounts, " +
            "availability, delivery estimates, star ratings, rating " +
            "distributions, review summaries, best-seller ranks, " +
            "category breadcrumbs, brand and seller info, titles, " +
            "descriptions, bullet features, specifications, and " +
            "image gallery URLs. Suited for market analysis, " +
            "competitor tracking, and data-driven decision-making.",
        docsUrl: "https://apify.com/junglee/free-amazon-product-scraper",
        categories: ["amazon"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/delicious_zebu~amazon-product-details-scraper/runs",
    },
    input: { schema: { body: zAmazonProductDetailsScraperBody } },
});
