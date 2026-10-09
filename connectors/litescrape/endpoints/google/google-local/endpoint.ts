import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleLocalQueryParams } from "./schema/inputs.ts";

/** GET /google/local — Search Google Local. */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Local",
        summary:
            "Search local businesses on Google Local and get listings with " +
            "ratings and addresses.",
        description:
            "Search Google's local results for a query at a named location. " +
            "Returns local_results (position, title, rating, reviews, " +
            "address, phone, hours, place_id, data_id) with the next-page " +
            "bookmark. Supports a target CID (ludocid), a named location or " +
            "uule, localization (gl, hl, google_domain), and offset paging. " +
            "For the reviews of a listing pass its data_id or place_id to " +
            "google/reviews. Suited for lead lists, local SEO audits, and " +
            "business discovery by area.",
        docsUrl: "https://litescrape.com/docs/google-local",
        categories: ["maps"],
        notes: [
            "Alpha upstream (litescrape.com/docs, 2026-09-20): result groups and field availability may change.",
            "Pass at most one of `location` or `uule`; the vendor answers 400 to both.",
        ],
    },
    request: { method: "GET", path: "/google/local" },
    input: {
        schema: {
            queryParams: zGoogleLocalQueryParams,
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
        /** v1 RESULT_GROUPS["/google/local"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "local_results",
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
