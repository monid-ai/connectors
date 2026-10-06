import { z } from "zod";
import { zCountry, zGl, zHl } from "../../../schema/common.ts";

/** cloro POST /v1/monitor/google/news request body (OpenAPI mirror).
 *  cloro requires country or gl; a request with neither is a 400. */
export const zGoogleNewsBody = z.strictObject({
    query: z.string().min(1).max(10_000).describe(
        "The Google News search query.",
    ),
    country: zCountry.optional(),
    gl: zGl.optional(),
    hl: zHl.optional(),
    device: z.enum(["desktop", "mobile", "ios", "android"]).optional()
        .describe(
            "Device the search runs from. mobile is an alias for android. " +
                "Default desktop.",
        ),
    pages: z.number().int().min(1).max(10).optional().describe(
        "News result pages to scrape (1-10). Default 1. Each page after " +
            "the first adds 2 credits.",
    ),
    include: z.strictObject({
        html: z.boolean().optional().describe(
            "Include the raw HTML of the Google News page.",
        ),
    }).optional(),
});
