import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookAdsLibraryScraperBody } from "./schema/inputs.ts";

/**
 * curious_coder/facebook-ads-library-scraper — Search Facebook Ads. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Facebook Ads",
        summary: "Scrape ads from the Meta/Facebook Ad Library by search " +
            "query or page.",
        description: "Scrapes ads from Meta/Facebook Ad Library by search or " +
            "by Facebook Page. Returns ad-level records with archive " +
            "and identification metadata, political/transparency " +
            "tags, creative snapshots, advertiser and page metadata, " +
            "spend and delivery metrics (impressions, reach " +
            "estimates, start/end dates), publisher/platform and " +
            "placement information, and performance insights. " +
            "Supports EU transparency data and seven-year historical " +
            "coverage for political ads.",
        docsUrl: "https://apify.com/curious_coder/facebook-ads-library-scraper",
        categories: ["facebook"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/curious_coder/facebook-ads-library-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/curious_coder~facebook-ads-library-scraper/runs",
    },
    input: { schema: { body: zFacebookAdsLibraryScraperBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "apify-actor-start": { kind: UsageModelKind.PER_CALL },
                "apify-default-dataset-item": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
            },
        },
        /** limitPerSource ads per url — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "apify-default-dataset-item":
                        body.limitPerSource !== undefined &&
                            body.limitPerSource > 0
                            ? body.limitPerSource *
                                Math.max(body.urls.length, 1)
                            : 3,
                },
            };
        },
    },
});
