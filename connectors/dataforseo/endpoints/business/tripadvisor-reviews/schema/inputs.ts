import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/business_data/tripadvisor/reviews/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zTripadvisorReviewsBody = z.object({
    url_path: z.string().min(1).describe(
        "URL path of the Tripadvisor page, e.g. Hotel_Review-g60763-d23462501-Reviews-Margaritaville_Times_Square-New_York_City_New_York.html (required unless keyword is given)",
    ).optional(),
    keyword: z.string().min(1).describe(
        "Keyword (required unless url_path is given)",
    ).optional(),
    ...zLocaleFields,
    depth: zDepth(4490, 10, 10),
    ratings: z.array(z.string().min(1)).describe(
        "Tripadvisor traveler rating for a place of interest (values: excellent, very_good, average, poor, terrible you can specify several values at once)",
    ).optional(),
    visit_type: z.array(z.string().min(1)).describe(
        "Filter by type of travelers who left a review (values: families, couples, solo, business, friends you can specify several values at once)",
    ).optional(),
    months: z.array(z.string().min(1)).describe(
        "Filter by months when a traveler made a visit (values: january, february, march, april, may, june, july, august, september, october, november, december)",
    ).optional(),
    sort_by: z.string().min(1).describe(
        "Results sorting parameters",
    ).optional(),
    translate_reviews: z.boolean().describe(
        "Translate reviews according to the URL path (default true)",
    ).optional(),
}).strict();
