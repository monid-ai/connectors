import { z } from "zod";

/** Octen /extract body (ported from v1). */
export const zOctenExtractBody = z.object({
    urls: z.array(z.string().max(2048)).min(1).max(20).describe(
        "URLs to extract content from (max 20 per request). Failed URLs " +
            "are returned with status 'failed' and are not billed.",
    ),
    query: z.string().optional().describe(
        "Intent-focused keywords. When provided, returns query-relevant " +
            "highlights per URL; otherwise the complete content.",
    ),
    max_age_seconds: z.number().int().positive().default(86400).describe(
        "Maximum age (seconds) of cached content before a re-fetch.",
    ),
    format: z.enum(["markdown", "text"]).default("markdown").describe(
        "Format of the returned content.",
    ),
    timeout: z.number().int().positive().default(30).describe(
        "Per-URL extraction timeout in seconds.",
    ),
    include_images: z.boolean().default(false),
    include_videos: z.boolean().default(false),
    include_audio: z.boolean().default(false),
}).strict();
