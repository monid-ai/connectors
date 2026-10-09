import { z } from "zod";
import { playgroundOptionFields, zAnyPageUrl } from "../../../schema/common.ts";

/** The playground Markdown preset's input — the HTML preset's fields
 *  (docs.mrscraper.com/docs/api/playground/scrape-markdown, 2026-09-17);
 *  options lifted to the query by `toRequest` (design D2). */
export const zScrapeMarkdownBody = z.object({
    url: zAnyPageUrl,
    geoCode: playgroundOptionFields.geoCode.optional(),
    proxyCountry: playgroundOptionFields.proxyCountry.optional(),
    browserRendering: playgroundOptionFields.browserRendering.optional(),
    waitUntil: playgroundOptionFields.waitUntil.optional(),
    timeout: playgroundOptionFields.timeout.optional(),
    blockResources: playgroundOptionFields.blockResources.optional(),
    waitForSelector: playgroundOptionFields.waitForSelector.optional(),
    super: playgroundOptionFields.super.optional(),
}).strict();
