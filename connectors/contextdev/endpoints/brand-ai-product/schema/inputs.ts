import { z } from "zod";
import {
    zPageUrl,
    zScrapeMaxAgeMs,
    zTimeoutOpts,
} from "../../../schema/common.ts";

/** POST /brand/ai/product body — the vendor mirror
 *  (docs.context.dev/api-reference/web-extraction/product, 2026-09-17).
 *  `tags` is not carried. */
export const zProductBody = z.object({
    url: zPageUrl.describe(
        "The product page URL to extract from. Context.dev first decides " +
            "whether the URL really is a product page.",
    ),
    maxAgeMs: zScrapeMaxAgeMs.describe(
        "Reuse a cached result younger than this many milliseconds. Default " +
            "604800000 (7 days), max 2592000000 (30 days).",
    ).optional(),
    timeoutOpts: zTimeoutOpts.optional(),
}).strict();
