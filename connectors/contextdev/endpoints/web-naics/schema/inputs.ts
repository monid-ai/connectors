import { z } from "zod";

/** GET /web/naics query params — the vendor mirror
 *  (docs.context.dev/api-reference/web-extraction/naics, 2026-09-17),
 *  scalar params only (design D6). */
export const zNaicsQueryParams = z.object({
    input: z.string().min(4).describe(
        "Brand domain (preferred, e.g. 'example.com') or company title. A " +
            "valid domain is classified directly; otherwise Context.dev " +
            "searches for the brand by title first.",
    ),
    minResults: z.number().int().min(1).max(10).describe(
        "Minimum number of codes to return (1-10). Default 1.",
    ).optional(),
    maxResults: z.number().int().min(1).max(10).describe(
        "Maximum number of codes to return (1-10). Default 5.",
    ).optional(),
}).strict();
