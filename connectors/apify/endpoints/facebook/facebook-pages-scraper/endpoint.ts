import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookPagesScraperBody } from "./schema/inputs.ts";
import { zFacebookPagesScraperOutput } from "./schema/output.ts";

/**
 * apify/facebook-pages-scraper — Get Facebook Page. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
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
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zFacebookPagesScraperOutput },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // vendor charge event: "apify-default-dataset-item"
            // survey-pinned Business-tier event price
            consumes: { credit: "default", amount: 0.0054 },
        },
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
