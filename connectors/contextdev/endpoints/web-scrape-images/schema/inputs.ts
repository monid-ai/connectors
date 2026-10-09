import { z } from "zod";
import {
    zPageUrl,
    zScrapeMaxAgeMs,
    zWaitForMs,
} from "../../../schema/common.ts";

/** GET /web/scrape/images query params — the vendor mirror
 *  (docs.context.dev/api-reference/web-scraping/images, 2026-09-17),
 *  scalar params only: the per-image `enrichment` object (a 5-credit
 *  call), `actions`, `headers` and `timeoutOpts` are deep-object query
 *  params the engine cannot send (design D6). */
export const zScrapeImagesQueryParams = z.object({
    url: zPageUrl,
    maxAgeMs: zScrapeMaxAgeMs.optional(),
    dedupe: z.boolean().describe(
        "Remove visually duplicate images: every image is loaded and " +
            "perceptually hashed and only the highest-resolution copy of " +
            "each duplicate group is kept. Default false.",
    ).optional(),
    waitForMs: zWaitForMs.optional(),
}).strict();
