import { z } from "zod";

/** GET /bing/maps query params (litescrape.com/docs/bing-maps, 2026-09-20). */
export const zBingMapsQueryParams = z.object({
    q: z.string().min(1).describe(
        "Search query. Required unless place_id is supplied.",
    ).optional(),
    cp: z.string().regex(/^-?\d+(\.\d+)?~-?\d+(\.\d+)?$/).describe(
        "Map center as 'latitude~longitude', such as '47.6062~-122.3321'.",
    ).optional(),
    setlang: z.string().min(2).max(32).describe(
        "Interface language such as 'en-US'.",
    ).optional(),
    place_id: z.string().min(1).describe(
        "Native Bing Maps entity ID for a detail lookup. Required unless q is supplied.",
    ).optional(),
    first: z.number().int().min(0).max(10000).describe(
        "Listing offset, 0-10,000. Default 0.",
    ).optional(),
    count: z.number().int().min(1).max(30).describe(
        "Number of listings, 1-30. Default 30.",
    ).optional(),
}).strict();
