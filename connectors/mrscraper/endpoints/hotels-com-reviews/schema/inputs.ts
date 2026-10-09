import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/hotels/hotels/review/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17), gated to its own site. */
export const zHotelsComReviewsBody = urlOnlyBody(siteUrl({
    site: "Hotels.com",
    brands: ["hotels"],
    example: "https://th.hotels.com/en/ho338863/mitsui-garden-hotel/",
}));
