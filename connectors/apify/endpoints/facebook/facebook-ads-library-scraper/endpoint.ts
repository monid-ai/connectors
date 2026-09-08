import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    request: {
        method: "POST",
        path: "/v2/acts/curious_coder~facebook-ads-library-scraper/runs",
    },
    input: { schema: { body: zFacebookAdsLibraryScraperBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            components: [
                { kind: UsageModelKind.PER_CALL },
                { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
            ],
        },
        /** limitPerSource ads per url — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.perQueryLimit(
            ["limitPerSource"],
            ["urls"],
            3,
        ),
    },
});
