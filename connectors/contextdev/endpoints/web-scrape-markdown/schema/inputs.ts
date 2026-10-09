import { z } from "zod";
import {
    markdownOptionFields,
    zCountry,
    zPageUrl,
    zScrapeMaxAgeMs,
    zWaitForMs,
    zZdr,
} from "../../../schema/common.ts";

/** GET /web/scrape/markdown query params — the vendor mirror
 *  (docs.context.dev/api-reference/web-scraping/markdown, 2026-09-17),
 *  scalar params only: `pdf`, `actions`, `headers`, `includeSelectors`,
 *  `excludeSelectors` and `timeoutOpts` are deep-object query params the
 *  engine cannot send (design D6). */
export const zScrapeMarkdownQueryParams = z.object({
    url: zPageUrl,
    includeLinks: markdownOptionFields.includeLinks.optional(),
    includeImages: markdownOptionFields.includeImages.optional(),
    shortenBase64Images: markdownOptionFields.shortenBase64Images.optional(),
    useMainContentOnly: markdownOptionFields.useMainContentOnly.optional(),
    includeHTML: z.boolean().describe(
        "Also return an html field with the page HTML the Markdown was " +
            "converted from. Default false.",
    ).optional(),
    includeFrames: markdownOptionFields.includeFrames.optional(),
    maxAgeMs: zScrapeMaxAgeMs.optional(),
    waitForMs: zWaitForMs.optional(),
    settleAnimations: z.boolean().describe(
        "Wait briefly for CSS and transition animations to settle before " +
            "converting the page. Default false.",
    ).optional(),
    country: zCountry.optional(),
    zdr: zZdr.optional(),
}).strict();
