import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    request: {
        method: "POST",
        path: "/v2/acts/damilo~google-shopping-apify/runs",
    },
    input: { schema: { body: zGoogleShoppingApifyBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** max_pages pages of num results each — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        /** max_pages × num results/page (else the 10-per-page guess; the
         *  actor's `num` is a STRING enum "10"…"100") — single-use
         *  counting rule, inline (D19 addendum). */
        estimate: ({ data, utils }) => {
            const body = data.input.body ?? null;
            const pages = utils.json.optionalNum(body, "$.max_pages");
            if (pages === undefined) return { counts: { "RESULT": 3 } };
            const size = Number(utils.json.optionalGet(body, "$.num"));
            return {
                counts: {
                    "RESULT": pages * (Number.isFinite(size) ? size : 10),
                },
            };
        },
    },
});
