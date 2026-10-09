import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleShoppingProductQueryParams } from "./schema/inputs.ts";

/** GET /google/shopping/product — Get Shopping Product. */
export default defineEndpoint({
    meta: {
        displayName: "Get Shopping Product",
        summary: "Open one Google Shopping product: merchant offers, specs, " +
            "reviews, related products.",
        description:
            "Open a product's own page on Google Shopping by the gpcid from a " +
            "shopping result. Returns product_result (title, description, " +
            "specifications), offers (position, merchant, price, delivery), " +
            "reviews, and related_products. Supports the companion " +
            "headline_offer_docid and image_docid ids, a prds selector token " +
            "instead of gpcid, a named location, and localization. Suited for " +
            "offer comparison across merchants, spec extraction, and price " +
            "tracking of one product.",
        docsUrl: "https://litescrape.com/docs/google-shopping-product",
        categories: ["google-shopping"],
        notes: [
            "Exactly one of `gpcid` or `prds`; `headline_offer_docid` and `image_docid` go with `gpcid`. A request with both or neither is rejected before the wire.",
            "Pass at most one of `location` or `uule`; the vendor answers 400 to both.",
        ],
    },
    request: { method: "GET", path: "/google/shopping/product" },
    input: {
        schema: {
            queryParams: z.union([
                zGoogleShoppingProductQueryParams.required({ gpcid: true })
                    .omit({
                        prds: true,
                    }),
                zGoogleShoppingProductQueryParams.required({ prds: true }).omit(
                    {
                        gpcid: true,
                        headline_offer_docid: true,
                        image_docid: true,
                    },
                ),
            ]).describe("Provide exactly one of gpcid or prds."),
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
        /** v1 RESULT_GROUPS["/google/shopping-product"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "product_result",
                "offers",
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
