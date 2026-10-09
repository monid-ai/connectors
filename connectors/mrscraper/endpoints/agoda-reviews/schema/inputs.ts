import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/hotels/agoda/review/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zAgodaReviewsBody = urlOnlyBody(siteUrl({
    site: "Agoda",
    brands: ["agoda"],
    example: "https://www.agoda.com/admiral-suites/hotel/bangkok-th.html",
}));
