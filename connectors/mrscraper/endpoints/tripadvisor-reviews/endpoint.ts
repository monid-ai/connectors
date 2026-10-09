import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTripadvisorReviewsBody } from "./schema/inputs.ts";

/** POST /api/hotels/tripadv/review/sync — TripAdvisor Reviews. */
export default defineEndpoint({
    meta: {
        displayName: "TripAdvisor Reviews",
        summary: "Scrape traveler reviews from a TripAdvisor listing page.",
        description:
            "Extract traveler reviews from a TripAdvisor hotel, restaurant, " +
            "or attraction review page URL: reviewer details, ratings, " +
            "titles, and review texts as structured data. Suited for " +
            "reputation monitoring and travel-sentiment analysis.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/tripadvisor/reviews",
    /** The vendor-designated TVLK host for TripAdvisor (design D12). */
    request: {
        method: "POST",
        path: "/api/hotels/tripadv/review/sync",
        baseUrl: "https://tvlk.mrscraper.com",
    },
    input: { schema: { body: zTripadvisorReviewsBody } },
    usage: {
        /** 20 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 20 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** The review scrapers' own basis (design D12): the provider's
         *  usable rule PLUS an empty `reviews` array counts zero — the
         *  vendor bills its full card for a page with no reviews (v1's
         *  2026-09-08 Agoda drill: 41 tokens for `reviews: []`). Stated
         *  verbatim in evidence and consolidate (closed terms). */
        evidence: ({ data, utils }) => {
            const counts: Record<string, number> = {};
            const success = utils.json.optionalGet(data.output, "$.success");
            const inner = utils.json.optionalGet(data.output, "$.data");
            let usable = success !== false && inner !== undefined &&
                inner !== null;
            if (usable && Array.isArray(inner)) {
                usable = inner.length > 0;
            }
            if (
                usable && typeof inner === "object" && inner !== null &&
                !Array.isArray(inner)
            ) {
                usable = Object.keys(inner).length > 0 &&
                    inner.status !== "FAIL" &&
                    !(Array.isArray(inner.reviews) &&
                        inner.reviews.length === 0);
            }
            counts.RESULT = usable ? 1 : 0;
            return { counts };
        },
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.tokenUsage",
            );
            const success = utils.json.optionalGet(rest, "$.success");
            const inner = utils.json.optionalGet(rest, "$.data");
            let usable = success !== false && inner !== undefined &&
                inner !== null;
            if (usable && Array.isArray(inner)) {
                usable = inner.length > 0;
            }
            if (
                usable && typeof inner === "object" && inner !== null &&
                !Array.isArray(inner)
            ) {
                usable = Object.keys(inner).length > 0 &&
                    inner.status !== "FAIL" &&
                    !(Array.isArray(inner.reviews) &&
                        inner.reviews.length === 0);
            }
            return {
                credits: {
                    ...(usable && typeof value === "number"
                        ? { default: value }
                        : {}),
                },
                output: rest,
            };
        },
    },
});
