import { z } from "zod";
import { googleSearchShape } from "../../../../schema/google-search.ts";

/** GET /google/search query params — the shared Google Search contract plus
 *  `fast_mode` (litescrape.com/docs/google-search, 2026-09-20). */
export const zGoogleSearchQueryParams = z.object({
    ...googleSearchShape,
    fast_mode: z.boolean().describe(
        "Return organic results only, skipping AI Overview and every other result group.",
    ).optional(),
}).strict();
