import { z } from "zod";
import { zLat, zLon } from "../../../../schema/common.ts";
import {
    zTripadvisorDomain,
    zTripadvisorId,
    zTripadvisorLocale,
} from "../../../../schema/tripadvisor.ts";

/** GET /tripadvisor/search query params (litescrape.com/docs/tripadvisor-search, 2026-09-20). */
export const zTripadvisorSearchQueryParams = z.object({
    q: z.string().min(1).max(500).describe(
        "Search text, up to 500 characters.",
    ),
    tripadvisor_domain: zTripadvisorDomain,
    locale: zTripadvisorLocale,
    geo_id: zTripadvisorId.describe(
        "Tripadvisor geography id to search within.",
    ).optional(),
    lat: zLat.describe("Search-center latitude. Requires lon.").optional(),
    lon: zLon.describe("Search-center longitude. Requires lat.").optional(),
    place_type: z.enum([
        "all",
        "accommodation",
        "attraction",
        "attraction_product",
        "eatery",
        "geo",
    ]).describe("Result entity type. Default 'all'.").optional(),
    start: z.number().int().min(0).max(10000).describe(
        "Result offset, 0-10,000. Default 0.",
    ).optional(),
    num: z.number().int().min(1).max(30).describe(
        "Number of results, 1-30. Default 30.",
    ).optional(),
}).strict();
