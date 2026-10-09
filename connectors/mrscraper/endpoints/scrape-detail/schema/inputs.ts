import { z } from "zod";
import {
    playgroundOptionFields,
    zAnyPageUrl,
    zPrompt,
} from "../../../schema/common.ts";

/** The playground `detail` agent's input (https://docs.mrscraper.com/docs/features/ai-scraper/general, 2026-09-17); options lifted to
 *  the query by `toRequest`, the agent name pinned there (design D2). */
export const zScrapeDetailBody = z.object({
    url: zAnyPageUrl,
    prompt: zPrompt.optional(),
    geoCode: playgroundOptionFields.geoCode.optional(),
    proxyCountry: playgroundOptionFields.proxyCountry.optional(),
    browserRendering: playgroundOptionFields.browserRendering.optional(),
    waitUntil: playgroundOptionFields.waitUntil.optional(),
    timeout: playgroundOptionFields.timeout.optional(),
    blockResources: playgroundOptionFields.blockResources.optional(),
    waitForSelector: playgroundOptionFields.waitForSelector.optional(),
    super: playgroundOptionFields.super.optional(),
}).strict();
