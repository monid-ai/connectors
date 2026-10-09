import { z } from "zod";
import { discoverPaginationFields } from "../../../schema/common.ts";

/** POST /discover body, the natural-language leg — the vendor mirror
 *  (hunter.io api-documentation/v2#discover "using the AI assistant",
 *  2026-09-17). */
export const zDiscoverAiBody = z.object({
    // a whitespace-only query would pass `.min(1)` and burn one of the
    // account's monthly AI translations; v1's `.trim()` does not compile,
    // the pattern does (design D7)
    query: z.string().min(1).regex(/\S/).describe(
        "Natural-language description of the target companies, e.g. " +
            "'fintech startups in Singapore founded after 2020'.",
    ),
    ...discoverPaginationFields,
}).strict();
