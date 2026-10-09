import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsSearchIntentBody } from "./schema/inputs.ts";

/**
 * Search Intent — `POST /v3/dataforseo_labs/google/search_intent/live` (v1
 * `/labs/search-intent`). Per-row: $0.012 per request plus $0.00012 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Intent",
        summary: "Classify keywords by search intent with probabilities.",
        description:
            "Search intent for up to 1000 keywords. Returns per keyword " +
            "the main intent (informational, navigational, commercial, " +
            "transactional) with probability, plus secondary intents. " +
            "Suited for mapping keywords to funnel stages. To find the " +
            "location_code and language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/search_intent/live/",
        categories: ["seo"],
    },
    endpoint: "/labs/search-intent",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/search_intent/live",
    },
    input: { schema: { body: zLabsSearchIntentBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.012 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.00012 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: ({ data }) => ({
            counts: { rows: data.input.body.keywords.length },
        }),
    },
});
