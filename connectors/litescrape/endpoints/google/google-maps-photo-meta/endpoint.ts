import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleMapsPhotoMetaQueryParams } from "./schema/inputs.ts";

/** GET /google/maps/photo-meta — Get Photo Metadata. */
export default defineEndpoint({
    meta: {
        displayName: "Get Photo Metadata",
        summary: "Resolve a Google Maps photo id to its contributor, place, " +
            "coordinates, and date.",
        description:
            "Look up the metadata behind one Google Maps photo. Returns user " +
            "(the contributor and profile link), location (the place it " +
            "belongs to and its coordinates), and date. Supports localization " +
            "(hl, gl, google_domain). Suited for attribution checks, UGC " +
            "research, and place-photo auditing.",
        docsUrl: "https://litescrape.com/docs/google-maps-photo-meta",
        categories: ["maps"],
        notes: [
            "The upstream answers `user`, `location`, and `date` (its docs once said `photo`); the billing check keys off `user` and `location`.",
        ],
    },
    request: { method: "GET", path: "/google/maps/photo-meta" },
    input: {
        schema: {
            queryParams: zGoogleMapsPhotoMetaQueryParams,
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
        /** v1 RESULT_GROUPS["/google/maps-photo"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "user",
                "location",
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
