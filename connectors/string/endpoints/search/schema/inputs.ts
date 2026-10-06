import { z } from "zod";

/**
 * `POST /v1/search` request body — the vendor mirror (String's own docs,
 * portal.usestring.ai/docs/api-reference/search, read 2026-10-06).
 * Optionality only, per the mirror convention: String rejects any other
 * field with a 400, so the mirror is strict; defaults documented as vendor
 * behavior are applied at the endpoint binding, not here.
 *
 * Not mirrored in this cut: the `google_ai_mode` engine (a generated
 * answer instead of ranked results), `location`/`coordinates`, and
 * `aiOverview` (billed at twice the search rate).
 */
export const zSearchBody = z.object({
    query: z.string().describe("The search query to run."),
    engine: z.enum(["google", "duckduckgo", "brave", "mojeek"]).optional()
        .describe("Search engine to query (vendor default 'google')."),
    country: z.string().length(2).optional().describe(
        "ISO 3166-1 alpha-2 country code used to localize results (vendor " +
            "default 'US'). Case-insensitive, normalized to uppercase.",
    ),
    language: z.string().optional().describe(
        "Optional language tag such as 'en' or 'pt-br' for result language.",
    ),
    searchCount: z.number().int().min(1).max(300).optional().describe(
        "Organic results wanted, 1 to 300. On the 'google' engine this " +
            "pages further results (up to 36 pages) until enough are " +
            "collected, billing one search per page fetched; the other " +
            "engines return one page of at most that many results.",
    ),
}).strict();
