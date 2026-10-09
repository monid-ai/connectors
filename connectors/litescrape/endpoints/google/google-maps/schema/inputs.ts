import { z } from "zod";
import {
    zGoogleLocale,
    zLat,
    zLon,
    zOffset,
    zQuery,
} from "../../../../schema/common.ts";

/** GET /google/maps query params (litescrape.com/docs/google-maps, 2026-09-20). */
export const zGoogleMapsQueryParams = z.object({
    q: zQuery.describe(
        "Business, category, address, or natural-language query. Required when type is 'search'.",
    ).optional(),
    type: z.enum(["search", "place"]).describe(
        "'search' for results, 'place' for an exact-place data sequence. Required for query searches.",
    ).optional(),
    ll: z.string().regex(/^@-?\d+(\.\d+)?,-?\d+(\.\d+)?,\d+(\.\d+)?[zm]$/)
        .describe(
            "Viewport as '@lat,lon,14z' (zoom) or '@lat,lon,5000m' (radius).",
        ).optional(),
    location: z.string().min(1).describe(
        "Named location resolved by the API. Requires z or m; cannot be combined with ll or lat/lon.",
    ).optional(),
    lat: zLat.describe(
        "Viewport center latitude. Requires lon and z or m.",
    ).optional(),
    lon: zLon.describe(
        "Viewport center longitude. Requires lat and z or m.",
    ).optional(),
    z: z.number().min(3).max(30).describe(
        "Zoom level for location or lat/lon geography, 3-30. Cannot be combined with m.",
    ).optional(),
    m: z.number().int().min(1).max(15_028_132).describe(
        "Search radius in meters for location or lat/lon geography. Cannot be combined with z.",
    ).optional(),
    nearby: z.boolean().describe(
        "Use the supplied geography as a nearby-search scope. Requires ll, location, or lat/lon.",
    ).optional(),
    place_id: z.string().min(1).describe(
        "Google place ID to resolve one exact place. Cannot be combined with data_cid or data.",
    ).optional(),
    data_cid: z.string().regex(/^\d+$/).describe(
        "Decimal Google CID to resolve one exact place. Cannot be combined with place_id or data.",
    ).optional(),
    data: z.string().min(1).max(8192).describe(
        "Google Maps protobuf parameter sequence for search filters or an exact place. Exact-place data requires type 'place'.",
    ).optional(),
    ...zGoogleLocale,
    min_price: z.number().int().min(0).describe(
        "Minimum price level. Cannot exceed max_price.",
    ).optional(),
    max_price: z.number().int().min(0).describe(
        "Maximum price level. Cannot be lower than min_price.",
    ).optional(),
    min_rating: z.union([
        z.literal(2),
        z.literal(2.5),
        z.literal(3),
        z.literal(3.5),
        z.literal(4),
        z.literal(4.5),
    ]).describe(
        "Preferred minimum rating (2, 2.5, 3, 3.5, 4, or 4.5). Google treats it as a relevance preference.",
    ).optional(),
    open_state: z.enum(["now", "24h"]).describe(
        "Only places open now or open 24 hours. Cannot be combined with open_on_day or open_at_hour.",
    ).optional(),
    open_on_day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
        .describe("Only places open on this day.").optional(),
    open_at_hour: z.number().int().min(0).max(23).describe(
        "Only places open at this hour, 24-hour clock. Requires open_on_day.",
    ).optional(),
    start: zOffset.describe(
        "Result offset. A Maps page holds 20 places. Default 0.",
    ).optional(),
}).strict();
