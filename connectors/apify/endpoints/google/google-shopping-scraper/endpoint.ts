import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "apify-actor-start": { kind: UsageModelKind.PER_CALL },
                "apify-default-dataset-item": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
            },
        },
        /** limit = products per call (schema default 10) — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.limitIsExact("limit", 10),
    },
});
