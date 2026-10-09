import { z } from "zod";
import {
    zColorScheme,
    zCountry,
    zDirectUrl,
    zDomain,
    zScrapeMaxAgeMs,
    zWaitForMs,
    zZdr,
} from "../../../schema/common.ts";

/** GET /web/screenshot query params — the vendor mirror
 *  (docs.context.dev/api-reference/web-scraping/screenshot, 2026-09-17),
 *  scalar params only: `viewport` and `timeoutOpts` are deep-object query
 *  params the engine cannot send (design D6). The vendor spells
 *  `fullScreenshot` as a string enum. */
export const zScreenshotQueryParams = z.object({
    domain: zDomain.describe(
        "Domain to screenshot, e.g. 'example.com'. Mutually exclusive with " +
            "directUrl.",
    ).optional(),
    directUrl: zDirectUrl.optional(),
    fullScreenshot: z.enum(["true", "false"]).describe(
        "'true' captures the entire page; 'false' (default) a single " +
            "viewport.",
    ).optional(),
    page: z.enum([
        "login",
        "signup",
        "blog",
        "careers",
        "pricing",
        "terms",
        "privacy",
        "contact",
    ]).describe(
        "Capture a specific page TYPE instead of the landing page: " +
            "Context.dev crawls the domain's links and picks the best match. " +
            "Only valid with domain.",
    ).optional(),
    waitForMs: zWaitForMs.optional(),
    handleCookiePopup: z.boolean().describe(
        "Dismiss the cookie/consent banner before capturing. Default false.",
    ).optional(),
    clearPopups: z.boolean().describe(
        "Dismiss detected cookie/consent UI and other obstructive popups " +
            "and overlays before capturing. Default false.",
    ).optional(),
    colorScheme: zColorScheme.optional(),
    scrollOffset: z.number().int().min(0).max(100000).describe(
        "Vertical scroll offset in pixels: returns the viewport-sized slice " +
            "starting at this Y offset, so a long page can be walked in " +
            "chunks. Takes precedence over fullScreenshot.",
    ).optional(),
    maxAgeMs: zScrapeMaxAgeMs.optional(),
    country: zCountry.optional(),
    zdr: zZdr.optional(),
}).strict();
