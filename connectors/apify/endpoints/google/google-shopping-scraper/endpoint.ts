import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleShoppingScraperBody } from "./schema/inputs.ts";

/**
 * burbn/google-shopping-scraper — Search Google Shopping. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
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
    input: {
        schema: {
            // `limit` is the primary limiting knob (products per call) —
            // WE require it at the binding (inner int/min(10)/max(100)
            // kept by .required, zod 4): the estimate must be deducible
            // to price the hold (D25)
            body: zGoogleShoppingScraperBody.required({ limit: true }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids are OUR snake_case row keys; `vendor` carries
            // the actor's charge-event name verbatim when it differs
            // (design D19/D26)
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    vendor: "apify-actor-start",
                    // survey-pinned GOLD-tier event price
                    consumes: { credit: "default", amount: 0.008 },
                },
                default_dataset_item: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "products",
                    vendor: "apify-default-dataset-item",
                    consumes: { credit: "default", amount: 0.005 },
                },
            },
        },
        /** limit = products per call (v1 LIMIT_IS_EXACT) — required at
         *  the binding, so the estimate is pure arithmetic (D25). */
        estimate: ({ data }) => ({
            counts: {
                "default_dataset_item": data.input.body.limit,
            },
        }),
    },
});
