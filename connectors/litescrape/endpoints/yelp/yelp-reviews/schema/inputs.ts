import { z } from "zod";
import { zLanguage } from "../../../../schema/common.ts";
import { zYelpDomain } from "../../../../schema/yelp.ts";

/** GET /yelp/reviews query params (litescrape.com/docs/yelp-reviews, 2026-09-20).
 *  `q`, `not_recommended`, and `not_recommended_start` are documented as
 *  "returns 422 when set" and are deliberately NOT mirrored: `.strict()`
 *  rejects them locally. `rating` is an ARRAY here; the provider-level
 *  toRequest joins it with commas on the wire, the form the vendor documents. */
export const zYelpReviewsQueryParams = z.object({
    place_id: z.string().min(1).describe(
        "Encoded Yelp business identifier from a search result.",
    ),
    yelp_domain: zYelpDomain,
    hl: zLanguage.describe(
        "Review language such as 'en' or 'fr-FR'. Default 'en'.",
    ).optional(),
    sortby: z.enum([
        "relevance_desc",
        "date_desc",
        "date_asc",
        "rating_desc",
        "rating_asc",
        "elites_desc",
    ]).describe("Review order. Default 'relevance_desc'.").optional(),
    rating: z.array(z.number().int().min(1).max(5)).min(1).max(5).describe(
        "Star ratings to keep, such as [1, 2]. Comma-separated on the wire.",
    ).optional(),
    start: z.number().int().min(0).max(10000).describe(
        "Review offset, 0-10,000. Default 0.",
    ).optional(),
    num: z.number().int().min(1).max(49).describe(
        "Number of reviews, 1-49. Default 49.",
    ).optional(),
}).strict();
