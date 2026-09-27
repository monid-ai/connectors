import { z } from "zod";
import {
    zCountry,
    zGl,
    zHl,
    zLocation,
    zUule,
} from "../../../schema/common.ts";

/**
 * cloro POST /v1/monitor/google request body (OpenAPI mirror). The spec
 * accepts three shapes: query + country, query + gl, or url. The mirror
 * keeps every field optional and does not state that rule; cloro answers a
 * wrong combination with a 400, which settles at zero.
 */
export const zGoogleBody = z.strictObject({
    query: z.string().min(1).max(10_000).optional().describe(
        "The Google search query. Required unless url is sent; the two are " +
            "mutually exclusive.",
    ),
    url: z.url().optional().describe(
        "A complete Google web search URL (path /search, non-empty q) to " +
            "run instead of query. cloro keeps q, gl, hl, uule, num (read " +
            "as result depth, rounded up to pages of 10, at most 10 pages), " +
            "start, tbs and safe, and drops the rest. Mutually exclusive " +
            "with query, location, uule and pages. URLs with tbm are " +
            "rejected (use cloro#monitor/google/news for news).",
    ),
    country: zCountry.optional(),
    gl: zGl.optional(),
    hl: zHl.optional(),
    location: zLocation.optional(),
    uule: zUule.optional(),
    device: z.enum(["desktop", "mobile", "ios", "android"]).optional()
        .describe(
            "Device the search runs from. mobile is an alias for android. " +
                "Default desktop.",
        ),
    pages: z.number().int().min(1).max(10).optional().describe(
        "Result pages to scrape (1-10). Default 1. Each page after the " +
            "first adds 2 credits. Cannot be combined with url.",
    ),
    include: z.strictObject({
        html: z.boolean().optional().describe(
            "Include the raw HTML of the Google result page.",
        ),
        aioverview: z.strictObject({
            markdown: z.boolean().optional().describe(
                "Include the AI Overview as markdown.",
            ),
        }).optional().describe(
            "Include the Google AI Overview. Sending this object, even " +
                "empty, adds the 2-credit AI Overview add-on.",
        ),
        paaAioverview: z.boolean().optional().describe(
            "Hydrate AI-Overview-type People Also Ask items with markdown " +
                "and sources. Adds the same 2-credit AI Overview add-on " +
                "(charged once with aioverview). Responses take longer.",
        ),
    }).optional(),
});
