import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTripadvisorSearchQueryParams } from "./schema/inputs.ts";

/** GET /tripadvisor/search — Search Tripadvisor. */
export default defineEndpoint({
    meta: {
        displayName: "Search Tripadvisor",
        summary:
            "Search Tripadvisor by text, geography, coordinates, and place " +
            "type.",
        description:
            "Search Tripadvisor for hotels, restaurants, attractions, and " +
            "geographies. Returns search_results (name, place type, rating, " +
            "review count, location, and the place_id for the place and " +
            "reviews endpoints) with pagination. Supports a place-type " +
            "filter, a geography id or lat/lon center, a locale and localized " +
            "domain, and 1-30 results per page. For one place's details and " +
            "prices pass its place_id to tripadvisor/place, for its reviews " +
            "to tripadvisor/reviews. Suited for travel research, hotel and " +
            "restaurant discovery, and review sourcing.",
        docsUrl: "https://litescrape.com/docs/tripadvisor-search",
        categories: ["maps", "hotels"],
        notes: [
            "`lat` and `lon` travel together; the vendor answers 400 to one without the other.",
        ],
    },
    request: { method: "GET", path: "/tripadvisor/search" },
    input: {
        schema: {
            queryParams: zTripadvisorSearchQueryParams,
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
        /** v1 RESULT_GROUPS["/tripadvisor/search"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "search_results",
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
