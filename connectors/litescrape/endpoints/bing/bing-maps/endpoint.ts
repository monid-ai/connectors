import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBingMapsQueryParams } from "./schema/inputs.ts";

/** GET /bing/maps — Search Bing Maps. */
export default defineEndpoint({
    meta: {
        displayName: "Search Bing Maps",
        summary:
            "Search Bing Maps listings around a map center, or look up one " +
            "entity by id.",
        description:
            "Search Bing Maps for businesses or resolve one entity. Returns " +
            "local_results (title, rating, address, phone, and the native " +
            "entity id) for a search, or place_results for a place_id lookup, " +
            "with pagination. Supports a map center, an interface language, " +
            "and offset and count paging up to 30 listings. Suited for local " +
            "business discovery and cross-checking Google Maps data.",
        docsUrl: "https://litescrape.com/docs/bing-maps",
        categories: ["maps"],
        notes: [
            "Pass at least one of `q` or `place_id`; a request with none is rejected before the wire.",
        ],
    },
    request: { method: "GET", path: "/bing/maps" },
    input: {
        schema: {
            queryParams: z.union([
                zBingMapsQueryParams.required({ q: true }),
                zBingMapsQueryParams.required({ place_id: true }),
            ]).describe("Provide at least one of q or place_id."),
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
        /** v1 RESULT_GROUPS["/bing/maps"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "local_results",
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
