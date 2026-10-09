import { z } from "zod";
import {
    zCountry,
    zDevice,
    zLat,
    zLon,
    zQuery,
} from "../../../../schema/common.ts";

/** GET /bing/search query params (litescrape.com/docs/bing-search, 2026-09-20).
 *  The fixed `engine=bing` selector is not mirrored: it has one accepted value
 *  and the endpoint pins it. */
export const zBingSearchQueryParams = z.object({
    q: zQuery.describe(
        "Search query, 1-2,048 characters. Bing syntax such as quoted phrases and exclusions works.",
    ),
    location: z.string().min(1).max(256).describe(
        "Named city-level origin used to localize the request.",
    ).optional(),
    lat: zLat.describe(
        "Latitude of the search origin; may be supplied alone or with lon.",
    ).optional(),
    lon: zLon.describe(
        "Longitude of the search origin; may be supplied alone or with lat.",
    ).optional(),
    mkt: z.string().regex(/^[a-zA-Z]{2}-[a-zA-Z]{2}$/).describe(
        "Language-country market such as 'en-US'. Cannot be combined with cc.",
    ).optional(),
    cc: zCountry.describe(
        "Two-letter country of origin such as 'US'. Cannot be combined with mkt.",
    ).optional(),
    first: z.number().int().min(1).describe(
        "One-based offset of the first organic result. Default 1.",
    ).optional(),
    safeSearch: z.enum(["off", "moderate", "strict"]).describe(
        "Adult-content policy. Default 'moderate'.",
    ).optional(),
    filters: z.string().min(1).max(8192).describe(
        "Native Bing display or date filter expression.",
    ).optional(),
    device: zDevice.describe(
        "Device layout Bing renders. Default 'desktop'.",
    ).optional(),
}).strict();
