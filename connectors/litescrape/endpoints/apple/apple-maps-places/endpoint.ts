import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAppleMapsPlacesQueryParams } from "./schema/inputs.ts";

/** GET /apple/maps/places — Get Apple Maps Places. */
export default defineEndpoint({
    meta: {
        displayName: "Get Apple Maps Places",
        summary:
            "Resolve up to 50 Apple Maps places by id with hours, phone, " +
            "website, and ratings.",
        description:
            "Resolve Apple Maps places by their ids in one call. Returns " +
            "place_results (title, address, structured_address, " +
            "gps_coordinates, phone, website, ratings, amenities, " +
            "weekly_hours, open_state, timezone, place type, and related " +
            "collections), one entry per id. Supports 1-50 ids per call, " +
            "billed as one request, and a locale for language and regional " +
            "formatting. For Apple's ratings and reviews of one place pass " +
            "one muid to apple/maps/reviews. Suited for place enrichment, " +
            "hours and contact lookups, and cross-referencing Google " +
            "listings.",
        docsUrl: "https://litescrape.com/docs/apple-maps-places",
        categories: ["maps"],
    },
    request: { method: "GET", path: "/apple/maps/places" },
    input: {
        schema: {
            queryParams: zAppleMapsPlacesQueryParams,
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
        /** v1 RESULT_GROUPS["/apple-maps/places"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "place_results",
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
