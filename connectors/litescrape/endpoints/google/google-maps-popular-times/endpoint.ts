import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleMapsPopularTimesQueryParams } from "./schema/inputs.ts";

/** GET /google/maps/popular-times — Get Live Foot Traffic. */
export default defineEndpoint({
    meta: {
        displayName: "Get Live Foot Traffic",
        summary: "Get the live busyness reading for one Google Maps place by " +
            "place_id.",
        description:
            "Fetch an uncached current-versus-usual busyness reading for one " +
            "Google place. Returns popular_times with the live level and the " +
            "usual level for this hour, and place (title, address), or " +
            "popular_times null when Google publishes no data for the place. " +
            "Supports localization (hl, gl, google_domain). Every reading is " +
            "fetched fresh and never replayed. Suited for foot-traffic " +
            "monitoring, visit timing, and location analytics.",
        docsUrl: "https://litescrape.com/docs/google-maps-popular-times",
        categories: ["maps"],
        notes: [
            "A place without published busyness data answers 200 with `popular_times: null`; that run records 0 credits here although the vendor deducts one.",
        ],
    },
    request: { method: "GET", path: "/google/maps/popular-times" },
    input: {
        schema: {
            queryParams: zGoogleMapsPopularTimesQueryParams,
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
        /** v1 RESULT_GROUPS["/google/maps-popular-times"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "popular_times",
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
