import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/burbn/google-shopping-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/burbn~google-shopping-scraper/runs",
    },
    input: { schema: { body: zGoogleShoppingScraperBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "apify-actor-start": {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                },
                "apify-default-dataset-item": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "products",
                },
            },
        },
        /** limit = products per call (v1 LIMIT_IS_EXACT) — it carries the
         *  actor's server default (10), so the estimate is pure
         *  arithmetic (D24). */
        estimate: ({ data }) => ({
            counts: {
                "apify-default-dataset-item": data.input.body.limit,
            },
        }),
    },
});
