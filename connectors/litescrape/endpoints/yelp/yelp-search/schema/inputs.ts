import { z } from "zod";
import { zYelpDomain } from "../../../../schema/yelp.ts";

/** GET /yelp/search query params (litescrape.com/docs/yelp-search, 2026-09-20).
 *  `attrs` is an ARRAY here; the provider-level toRequest joins it with commas
 *  on the wire, the form the vendor documents. */
export const zYelpSearchQueryParams = z.object({
    find_loc: z.string().min(1).describe(
        "Search location, such as a city or neighborhood.",
    ),
    find_desc: z.string().min(1).describe(
        "Business name, category, or search terms.",
    ).optional(),
    yelp_domain: zYelpDomain,
    l: z.string().min(1).describe("Yelp-native map bounds token.").optional(),
    cflt: z.string().regex(/^[A-Za-z0-9_-]+$/).describe(
        "Yelp category identifier, such as 'coffee' or 'restaurants'.",
    ).optional(),
    sortby: z.enum(["recommended", "rating", "review_count"])
        .describe("Result order. Default 'recommended'.").optional(),
    attrs: z.array(z.string().min(1)).min(1).describe(
        "Yelp attribute filters, such as ['open_now', 'price.1']. Comma-separated on the wire.",
    ).optional(),
    start: z.number().int().min(0).max(10000).describe(
        "Result offset, 0-10,000. Default 0.",
    ).optional(),
}).strict();
