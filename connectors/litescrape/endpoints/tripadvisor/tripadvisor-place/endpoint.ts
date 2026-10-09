import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTripadvisorPlaceQueryParams } from "./schema/inputs.ts";

/** GET /tripadvisor/place — Get Tripadvisor Place. */
export default defineEndpoint({
    meta: {
        displayName: "Get Tripadvisor Place",
        summary: "Get one Tripadvisor place with rating, ranking, contacts, " +
            "amenities, and prices.",
        description:
            "Resolve one Tripadvisor place by its id. Returns place_results " +
            "(name, type, rating and review count, ranking, address, contact " +
            "details, amenities, and price fields in the requested currency). " +
            "Supports a locale, a localized domain, a parent geography id, " +
            "and an ISO currency. Suited for hotel and restaurant profiling " +
            "and price checks.",
        docsUrl: "https://litescrape.com/docs/tripadvisor-place",
        categories: ["maps", "hotels"],
    },
    request: { method: "GET", path: "/tripadvisor/place" },
    input: {
        schema: {
            queryParams: zTripadvisorPlaceQueryParams,
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
        /** v1 RESULT_GROUPS["/tripadvisor/place"] through hasAnyResultGroup (design
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
