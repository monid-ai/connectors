import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAmazonProductDetailsScraperBody } from "./schema/inputs.ts";

/**
 * delicious_zebu/amazon-product-details-scraper — Get Amazon Product. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
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
        // the actor's OWN page (v1 pointed at the unrelated junglee actor —
        // fixed in the 2026-09-16 reconcile; both URLs verified live)
        docsUrl:
            "https://apify.com/delicious_zebu/amazon-product-details-scraper",
        categories: ["amazon"],
        notes: [
            "There is no result-limit parameter - the number of results " +
            "(and the bill) equals the number of input queries.",
        ],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/delicious_zebu/amazon-product-details-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/delicious_zebu~amazon-product-details-scraper/runs",
    },
    input: { schema: { body: zAmazonProductDetailsScraperBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // vendor charge event: "apify-default-dataset-item"
            // survey-pinned Business-tier event price
            consumes: { credit: "default", amount: 0.0015 },
        },
        /** one result per Params entry (ASIN/URL, v1 ONE_PER_QUERY) — an
         *  empty batch promises 0 (deduced, design D25). */
        estimate: ({ data }) => ({
            counts: {
                "RESULT": data.input.body.Params.length,
            },
        }),
    },
});
