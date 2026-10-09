import { z } from "zod";
import { playgroundOptionFields, zAnyPageUrl } from "../../../schema/common.ts";

/** The playground HTML preset's input — one flat object (v1 shape,
 *  docs.mrscraper.com/docs/api/v3/scraper/unblocker-scraping, 2026-09-17);
 *  the option fields ride the query string upstream and `toRequest` lifts
 *  them (design D2). Not carried: `retry` / `tokenCap` (each upstream
 *  retry bills tokens), `cookies`, `proxy` (own proxy), `action`. */
export const zScrapeHtmlBody = z.object({
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
