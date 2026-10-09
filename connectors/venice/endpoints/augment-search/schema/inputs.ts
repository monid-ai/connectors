import { z } from "zod";

/**
 * `POST /augment/search` request body — mirrors Venice's
 * `WebSearchRequest` (https://docs.venice.ai). Optionality only (D25).
 */
export const zAugmentSearchBody = z.object({
    query: z.string().min(1).max(400).describe("The search query."),
    limit: z.number().int().min(1).max(20).optional().describe(
        "Maximum results to return (vendor default 10, max 20).",
    ),
    search_provider: z.enum(["brave", "google"]).optional().describe(
        "`brave` (vendor default): Brave Search with Zero Data Retention " +
            "— queries are never stored or logged. `google`: Google " +
            "Search, anonymized — proxied so your identity is not " +
            "attached to the query.",
    ),
});
