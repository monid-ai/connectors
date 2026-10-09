import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleMapsPostsQueryParams } from "./schema/inputs.ts";

/** GET /google/maps/posts — Get Maps Posts. */
export default defineEndpoint({
    meta: {
        displayName: "Get Maps Posts",
        summary: "Get the posts a business has published on its Google Maps " +
            "listing.",
        description:
            "Fetch the updates a business posted on its Google Maps listing, " +
            "identified by the listing's data_id. Returns posts (text, date, " +
            "media, links) and a next_page_token when more exist; a listing " +
            "without posts returns no posts group. Supports continuation " +
            "paging and localization. Suited for competitor activity " +
            "tracking, offer monitoring, and local marketing research.",
        docsUrl: "https://litescrape.com/docs/google-maps-posts",
        categories: ["maps"],
        notes: [
            "A listing without posts answers 200 without a `posts` group; that run records 0 credits here although the vendor deducts one.",
        ],
    },
    request: { method: "GET", path: "/google/maps/posts" },
    input: {
        schema: {
            queryParams: zGoogleMapsPostsQueryParams,
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
        /** v1 RESULT_GROUPS["/google/maps-posts"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "posts",
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
