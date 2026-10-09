import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleShoppingQueryParams } from "./schema/inputs.ts";

/** GET /google/shopping — Search Google Shopping. */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Shopping",
        summary:
            "Search Google Shopping and get products with prices, merchants, " +
            "ratings, and refinements.",
        description: "Search Google Shopping for a product query. Returns " +
            "shopping_results (position, title, price, source merchant, " +
            "rating, reviews, thumbnail, and the gpcid, headline_offer_docid, " +
            "image_docid that open the product), " +
            "categorized_shopping_results, and Google's refinement chips as " +
            "shoprs tokens in filters. Supports a price range, on-sale, " +
            "free-shipping, and small-business refinements (one at a time), " +
            "price or rating sorting, up to 100 products per call, a named " +
            "location, and localization. To open one product with every " +
            "merchant offer pass its gpcid (and headline_offer_docid, " +
            "image_docid) plus the same q to google/shopping/product. Suited " +
            "for price comparison, product research, and merchant discovery.",
        docsUrl: "https://litescrape.com/docs/google-shopping",
        categories: ["google-shopping"],
        notes: [
            "Pass at least one of `q` or `shoprs`; a request with none is rejected before the wire.",
            "Pass at most one of `location` or `uule`; the vendor answers 400 to both.",
            "Google applies one refinement at a time: a price range (`min_price` / `max_price`, with `max_price` at or above `min_price`), `on_sale`, `free_shipping`, or `small_business`; `sort_by` combines with any one of them. The vendor answers 400 to more than one.",
        ],
    },
    request: { method: "GET", path: "/google/shopping" },
    input: {
        schema: {
            queryParams: z.union([
                zGoogleShoppingQueryParams.required({ q: true }),
                zGoogleShoppingQueryParams.required({ shoprs: true }),
            ]).describe("Provide at least one of q or shoprs."),
        },
    },
    usage: {
        /** One Litescrape credit per call that returned a result group —
         *  the flat card cited in provider.ts (design D2), counted 0|1 by
         *  the evidence below (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "calls with results",
            description: "calls whose response carried a result group",
            consumes: { credit: "default", amount: 1 },
        },
        // estimate is inherited: the provider promises one call
        /** v1 RESULT_GROUPS["/google/shopping"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "shopping_results",
                "categorized_shopping_results",
            ];
            const body = data.output;
            let hit = 0;
            if (
                typeof body === "object" && body !== null &&
                !Array.isArray(body)
            ) {
                for (const key of groups) {
                    const value = (body as Record<string, unknown>)[key];
                    if (value === null || value === undefined) continue;
                    if (Array.isArray(value)) {
                        if (value.length > 0) hit = 1;
                        continue;
                    }
                    if (typeof value === "string") {
                        if (value.length > 0) hit = 1;
                        continue;
                    }
                    if (typeof value === "object") {
                        if (Object.keys(value).length > 0) hit = 1;
                        continue;
                    }
                    hit = 1;
                }
            }
            return { counts: { RESULT: hit } };
        },
    },
});
