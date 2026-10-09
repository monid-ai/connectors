import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDuckDuckGoMapsQueryParams } from "./schema/inputs.ts";

/** GET /duckduckgo/maps — Search DuckDuckGo Maps. */
export default defineEndpoint({
    meta: {
        displayName: "Search DuckDuckGo Maps",
        summary:
            "Search DuckDuckGo Maps for places inside a viewport rectangle or " +
            "around a center.",
        description:
            "Find places on DuckDuckGo Maps within a viewport. Returns " +
            "local_results (title, address, coordinates, phone, website, " +
            "rating, and their Apple Maps and Yelp ids). Supports a " +
            "top,left,bottom,right bounding box or a lat/lon center, and a " +
            "strict-bounds toggle. Suited for place discovery by area and " +
            "cross-checking other map providers.",
        docsUrl: "https://litescrape.com/docs/duckduckgo-maps",
        categories: ["maps"],
        notes: [
            "Exactly one of `bbox` or the `lat`/`lon` pair (`lat` and `lon` travel together); a request with both or neither is rejected before the wire.",
        ],
    },
    request: { method: "GET", path: "/duckduckgo/maps" },
    input: {
        schema: {
            queryParams: z.union([
                zDuckDuckGoMapsQueryParams.required({ bbox: true }).omit({
                    lat: true,
                    lon: true,
                }),
                zDuckDuckGoMapsQueryParams.required({ lat: true, lon: true })
                    .omit({
                        bbox: true,
                    }),
            ]).describe("Provide exactly one of bbox or the lat/lon pair."),
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
        /** v1 RESULT_GROUPS["/duckduckgo/maps"] through hasAnyResultGroup (design
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
