import { z } from "zod";
import { playgroundOptionFields, zAnyPageUrl } from "../../../schema/common.ts";

/** The playground screenshot preset's input
 *  (docs.mrscraper.com/docs/api/playground/get-screenshot, 2026-09-17):
 *  browser rendering is forced on by the preset, so the rendering knobs
 *  it would toggle are not exposed; `recording` (a video in the vendor's
 *  storage) is not carried. */
export const zScrapeScreenshotBody = z.object({
    url: zAnyPageUrl,
    screenshot: z.enum(["full", "top"]).describe(
        "Capture area: 'full' for the entire scroll height (default), " +
            "'top' for the visible viewport only.",
    ).optional(),
    geoCode: playgroundOptionFields.geoCode.optional(),
    proxyCountry: playgroundOptionFields.proxyCountry.optional(),
    waitUntil: playgroundOptionFields.waitUntil.optional(),
    timeout: playgroundOptionFields.timeout.optional(),
    waitForSelector: playgroundOptionFields.waitForSelector.optional(),
    super: playgroundOptionFields.super.optional(),
}).strict();
