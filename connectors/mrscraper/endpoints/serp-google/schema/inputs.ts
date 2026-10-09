import { z } from "zod";

/** POST /api/google/serp/v2/sync body — the vendor mirror (the marketplace
 *  card and v1's drills, 2026-09-17). `format` (json | html) is pinned to
 *  json by `toRequest` and not exposed (design D2); `renderJs` is not
 *  carried. */
export const zGoogleSerpBody = z.object({
    query: z.string().min(1).describe("Search query to run against Google."),
    region: z.string().length(2).describe(
        "Two-letter Google region code, e.g. 'us' (default 'us').",
    ).optional(),
    language: z.string().length(2).describe(
        "Two-letter interface language code, e.g. 'en' (default 'en').",
    ).optional(),
    page: z.number().int().min(1).describe(
        "Results page number (1-indexed; default 1).",
    ).optional(),
}).strict();
