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
    input: {
        schema: {
            // `max_pages` is the primary limiting knob (page cap) — WE
            // require it at the binding: the estimate must be deducible
            // to price the hold (D25)
            body: zGoogleShoppingApifyBody.required({ max_pages: true }),
        },
    },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** max_pages × num results/page × queries (the actor's `num` is a
         *  REQUIRED STRING enum "10"…"100", so Number() always yields a
         *  finite page size; v1 LIMIT_IS_PAGES missed the multi-query
         *  multiplier). max_pages is required at the binding, so the
         *  estimate is pure arithmetic (D25). */
        estimate: ({ data }) => {
            const body = data.input.body;
            // absent/empty `queries` ⇒ the actor runs the single `query`
            // field — exactly one search (deduced mode, not a fallback)
            const nQueries = body.queries?.length ?? 0;
            const queries = nQueries > 0 ? nQueries : 1;
            return {
                counts: {
                    "RESULT": body.max_pages * Number(body.num) * queries,
                },
            };
        },
    },
});
