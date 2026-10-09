import { z } from "zod";

/** POST /multi-domain-search/reveal body — the vendor mirror (hunter.io
 *  api-documentation/v2#multi-domain-search-reveal, 2026-09-17). */
export const zRevealBody = z.object({
    handles: z.array(z.string().min(1)).min(1).max(100).describe(
        "reveal_handle values from a multi-domain search response. " +
            "Max 100 per request.",
    ),
}).strict();
