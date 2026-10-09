import { z } from "zod";
import {
    markdownOptionFields,
    zCountry,
    zPageUrl,
    zScrapeMaxAgeMs,
    zWaitForMs,
    zZdr,
} from "../../../schema/common.ts";

/** GET /web/scrape/html query params — the vendor mirror
 *  (docs.context.dev/api-reference/web-scraping/html, 2026-09-17), scalar
 *  params only (design D6). */
export const zScrapeHtmlQueryParams = z.object({
    url: zPageUrl,
    includeFrames: z.boolean().describe(
        "Render iframes inline into the returned HTML. Default false.",
    ).optional(),
    useMainContentOnly: markdownOptionFields.useMainContentOnly.optional(),
    maxAgeMs: zScrapeMaxAgeMs.optional(),
    waitForMs: zWaitForMs.optional(),
    settleAnimations: z.boolean().describe(
        "Wait briefly for CSS and transition animations to settle before " +
            "the HTML is captured. Default false.",
    ).optional(),
    country: zCountry.optional(),
    zdr: zZdr.optional(),
}).strict();
