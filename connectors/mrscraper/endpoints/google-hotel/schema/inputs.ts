import { siteUrl, urlOnlyBody } from "../../../schema/common.ts";

/** POST /api/google/serp/sync body (the Google Hotels entity scraper) —
 *  the vendor mirror (the marketplace card via v1, 2026-09-17), gated to
 *  a Google Hotels entity URL. */
export const zGoogleHotelBody = urlOnlyBody(siteUrl({
    site: "Google Hotels",
    brands: ["google"],
    example:
        "https://www.google.com/travel/hotels/entity/ChUI17vV0u_fprYCGgkvbS8wZGQ5MDMQAQ",
    pathPattern: "/travel/hotels/",
    pathNote: "hotels entity (/travel/hotels/)",
}));
