import { z } from "zod";
import {
    playgroundOptionFields,
    zAnyPageUrl,
    zPrompt,
} from "../../../schema/common.ts";

/** The playground `listing` agent's input
 *  (docs.mrscraper.com/docs/api/playground/listing-page, 2026-09-17);
 *  options lifted to the query by `toRequest`, the agent pinned there
 *  (design D2). */
export const zScrapeListingBody = z.object({
    url: zAnyPageUrl,
    prompt: zPrompt.optional(),
    maxPages: z.number().int().min(1).max(20).describe(
        "Maximum listing pages to sweep (1-20): numbered pages, 'Load " +
            "More', or infinite scroll, where one batch of loaded data " +
            "counts as a page. Each page adds runtime and AI tokens.",
    ).optional(),
    geoCode: playgroundOptionFields.geoCode.optional(),
    proxyCountry: playgroundOptionFields.proxyCountry.optional(),
    browserRendering: playgroundOptionFields.browserRendering.optional(),
    waitUntil: playgroundOptionFields.waitUntil.optional(),
    timeout: playgroundOptionFields.timeout.optional(),
    blockResources: playgroundOptionFields.blockResources.optional(),
    waitForSelector: playgroundOptionFields.waitForSelector.optional(),
    super: playgroundOptionFields.super.optional(),
}).strict();
