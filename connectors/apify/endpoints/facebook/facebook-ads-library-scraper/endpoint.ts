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
    input: {
        schema: {
            // the actor caps ads via `count` (TOTAL across the run,
            // prefill 100 — editor-only, NOT a server default) and
            // optionally `limitPerSource` (per URL); with both absent it
            // scrapes ALL ads — WE require count ≥ 1 (the actor states no
            // floor): the estimate must be deducible to price the hold
            // (D24). limitPerSource stays optional (it can only lower the
            // total below count).
            body: zFacebookAdsLibraryScraperBody.extend({
                count: zFacebookAdsLibraryScraperBody.shape.count
                    .unwrap().min(1),
            }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "apify-actor-start": {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                },
                "apify-default-dataset-item": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "ads",
                },
            },
        },
        /** count = the run's TOTAL ad cap (the old estimate read the
         *  optional per-URL limitPerSource and fell back to a constant) —
         *  required ≥ 1 at the binding, so the estimate is pure
         *  arithmetic (D24). */
        estimate: ({ data }) => ({
            counts: {
                "apify-default-dataset-item": data.input.body.count,
            },
        }),
    },
});
