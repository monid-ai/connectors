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
    max_age_seconds: z.number().int().positive().describe(
        "Maximum age (seconds) of cached content before a re-fetch.",
    ).optional(),
    format: z.enum(["markdown", "text"]).describe(
        "Format of the returned content.",
    ).optional(),
    timeout: z.number().int().positive().describe(
        "Per-URL extraction timeout in seconds.",
    ).optional(),
    include_images: z.boolean().optional(),
    include_videos: z.boolean().optional(),
    include_audio: z.boolean().optional(),
}).strict();
