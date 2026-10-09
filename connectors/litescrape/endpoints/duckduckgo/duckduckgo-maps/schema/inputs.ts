import { z } from "zod";
import { zLat, zLon } from "../../../../schema/common.ts";

/** GET /duckduckgo/maps query params (litescrape.com/docs/duckduckgo-maps, 2026-09-20). */
export const zDuckDuckGoMapsQueryParams = z.object({
    q: z.string().min(1).max(500).describe(
        "Place or category query, up to 500 characters.",
    ),
    bbox: z.string().regex(/^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){3}$/).describe(
        "Viewport rectangle as 'top,left,bottom,right'. Required unless lat and lon are supplied.",
    ).optional(),
    lat: zLat.describe("Viewport center latitude. Requires lon.").optional(),
    lon: zLon.describe("Viewport center longitude. Requires lat.").optional(),
    strict_bbox: z.boolean().describe(
        "Exclude results outside the requested bounds. Default true.",
    ).optional(),
}).strict();
