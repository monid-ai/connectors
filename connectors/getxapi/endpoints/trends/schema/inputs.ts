import { z } from "zod";
import { zNumericId } from "../../../schema/common.ts";

/** GET /trends query params (docs.getxapi.com/docs/trends/get-trends,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zTrendsQueryParams = z.object({
    country: z.string().min(1).describe(
        "Country or city name, or ISO country code, for example 'US', 'india' or 'tokyo'. Defaults to worldwide.",
    ).optional(),
    woeid: zNumericId.describe(
        "Yahoo WOEID of the location, for example '23424977' for the United States. Takes precedence over country.",
    ).optional(),
    count: z.number().int().min(1).max(50).describe(
        "Maximum number of trends to return, 1-50. X returns up to 50.",
    ).optional(),
}).strict();
