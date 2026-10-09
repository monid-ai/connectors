import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleMapsQueryParams } from "./schema/inputs.ts";

/** GET /google/maps — Search Google Maps. */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Maps",
        summary:
            "Search Google Maps places in a viewport, or resolve one exact " +
            "place by id.",
        description:
            "Search Google Maps for businesses, categories, or addresses " +
            "inside a viewport, or resolve one exact place. Returns " +
            "local_results (position, title, rating, reviews, address, hours, " +
            "phone, place_id, data_id, reviews_link) with a next-page " +
            "bookmark, or place_results for one place (description, price, " +
            "hours, service options, photos, photo_meta_link). Supports an " +
            "@lat,lon,zoom viewport, a named location or lat/lon with zoom or " +
            "radius, nearby-search scope, price level, minimum rating, and " +
            "open-state filters, and localization. A page holds 20 places; " +
            "follow pagination.next for the next 20. For a result's reviews " +
            "pass its place_id or data_id to google/reviews, for live foot " +
            "traffic its place_id to google/maps/popular-times, for its posts " +
            "its data_id to google/maps/posts. Suited for local lead lists, " +
            "competitor mapping, and place lookups by id.",
        docsUrl: "https://litescrape.com/docs/google-maps",
        categories: ["maps"],
        notes: [
            "A search needs `q` and `type`; an exact place needs exactly one of `place_id`, `data_cid`, or `data` (exact-place `data` also needs `type` 'place'). A request matching neither form is rejected before the wire.",
            "`lat` and `lon` travel together; pass at most one of `ll`, `location`, or `lat`/`lon`; `location` and `lat`/`lon` need `z` or `m` (never both); `nearby` needs a geography; `open_state` cannot be combined with `open_on_day` or `open_at_hour`; `open_at_hour` needs `open_on_day`; `min_price` cannot exceed `max_price`. The vendor answers 400 to a violation.",
            "Each successful page costs one credit, including an empty or duplicate-only page past the end; follow `pagination.next` rather than computing `start` by hand.",
        ],
    },
    request: { method: "GET", path: "/google/maps" },
    input: {
        schema: {
            queryParams: z.union([
                zGoogleMapsQueryParams.required({ q: true, type: true }),
                zGoogleMapsQueryParams.required({ place_id: true }).omit({
                    data_cid: true,
                    data: true,
                }),
                zGoogleMapsQueryParams.required({ data_cid: true }).omit({
                    place_id: true,
                    data: true,
                }),
                zGoogleMapsQueryParams.required({ data: true }).omit({
                    place_id: true,
                    data_cid: true,
                }),
            ]).describe(
                "A search (q and type) or an exact place (exactly one of place_id, data_cid, or data).",
            ),
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
        /** v1 RESULT_GROUPS["/google/maps"] through hasAnyResultGroup (design
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
