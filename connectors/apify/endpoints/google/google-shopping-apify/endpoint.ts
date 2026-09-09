import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleShoppingApifyBody } from "./schema/inputs.ts";

/**
 * damilo/google-shopping-apify — Search Google Shopping (Apify). Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Shopping (Apify)",
        summary: "Scrape live Google Shopping product listings by keyword " +
            "with localization and pagination.",
        description: "Scrapes live product listings from Google Shopping by " +
            "keyword search, straight from Google's Shopping tab. " +
            "Returns product titles, prices, sellers, ratings, " +
            "review counts, shipping details, images, offer counts, " +
            "product identifiers (GTIN/MPN), listing positions, and " +
            "sponsored/organic flags. Supports localization by " +
            "country and language with automatic pagination. Suited " +
            "for e-commerce price monitoring and market analysis.",
        docsUrl: "https://apify.com/damilo/google-shopping-apify",
        categories: ["google-shopping"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/damilo/google-shopping-apify",
    request: {
        method: "POST",
        path: "/v2/acts/damilo~google-shopping-apify/runs",
    },
    input: { schema: { body: zGoogleShoppingApifyBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** max_pages × num results/page (the actor's `num` is a REQUIRED
         *  STRING enum "10"…"100", so Number() always yields a finite
         *  page size) — single-use counting rule, inline (D19 addendum).
         *  The schema is the source of truth: typed body access. */
        estimate: ({ data }) => {
            const body = data.input.body;
            if (body.max_pages === undefined) {
                return { counts: { "RESULT": 3 } };
            }
            return {
                counts: {
                    "RESULT": body.max_pages * Number(body.num),
                },
            };
        },
    },
});
