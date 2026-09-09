import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zFacebookPagesScraperBody } from "./schema/inputs.ts";

/**
 * apify/facebook-pages-scraper — Get Facebook Page. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Facebook Page",
        summary: "Extract public data from Facebook pages and profiles: " +
            "contact info, likes, followers, ratings.",
        description: "Extracts data from one or more Facebook Pages or " +
            "Profiles. Returns page details, website, email, " +
            "address, messenger link, likes, followers, rating, ad " +
            "running status, audience signals, activity indicators, " +
            "and post content for page presence monitoring and " +
            "enrichment workflows.",
        docsUrl: "https://apify.com/apify/facebook-pages-scraper",
        categories: ["facebook"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/apify~facebook-pages-scraper/runs",
    },
    input: { schema: { body: zFacebookPagesScraperBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** one page record per startUrl — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.onePerQuery("startUrls"),
    },
});
