import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/hotels/tripadv/review/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zTripadvisorReviewsBody = urlOnlyBody(siteUrl({
    site: "TripAdvisor",
    brands: ["tripadvisor"],
    example: "https://www.tripadvisor.com/Hotel_Review-g293916-d308699",
}));
