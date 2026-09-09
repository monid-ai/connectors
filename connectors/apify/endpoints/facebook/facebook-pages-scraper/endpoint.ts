import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/facebook-pages-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~facebook-pages-scraper/runs",
    },
    input: { schema: { body: zFacebookPagesScraperBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** one page record per startUrl (v1 ONE_PER_QUERY) — startUrls is
         *  actor-required; an empty batch is a no-op run and estimates 0,
         *  which is correct (D25). */
        estimate: ({ data }) => ({
            counts: {
                "RESULT": data.input.body.startUrls.length,
            },
        }),
    },
});
