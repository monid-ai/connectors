import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zHotelsComReviewsBody } from "./schema/inputs.ts";

/** POST /api/hotels/hotels/review/sync — Hotels.com Guest Reviews. */
export default defineEndpoint({
    meta: {
        displayName: "Hotels.com Guest Reviews",
        summary: "Scrape guest reviews from a Hotels.com hotel page.",
        description:
            "Extract guest reviews from a Hotels.com hotel page URL: " +
            "reviewer details, scores, stay duration, traveler type, and " +
            "positive/negative comments as structured data. Suited for " +
            "guest-sentiment analysis and reputation monitoring.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/hotels-com/reviews",
    request: { method: "POST", path: "/api/hotels/hotels/review/sync" },
    // the vendor lists 60 s+ latency for this scraper; v1's 330 s budget
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: { schema: { body: zHotelsComReviewsBody } },
    usage: {
        /** 24 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 24 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
