import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPremiumXFollowerScraperFollowingDataBody } from "./schema/inputs.ts";

/**
 * kaitoeasyapi/premium-x-follower-scraper-following-data — Get X (Twitter) Followers. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Followers",
        summary: "Extract follower and following lists with rich profile " +
            "data from X (Twitter) accounts.",
        description:
            "Extracts follower and following lists with rich profile " +
            "metadata from X (Twitter) accounts by username or user " +
            "ID. Returns profile statistics, bio and location text, " +
            "verification status, account creation date, profile and " +
            "banner images, professional account details, contact " +
            "email extraction, and recent status metadata. Suited " +
            "for audience analysis, influencer discovery, network " +
            "mapping, and lead generation from follower graphs.",
        docsUrl:
            "https://apify.com/kaitoeasyapi/premium-x-follower-scraper-following-data",
        categories: ["twitter"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/kaitoeasyapi/premium-x-follower-scraper-following-data",
    request: {
        method: "POST",
        path:
            "/v2/acts/kaitoeasyapi~premium-x-follower-scraper-following-data/runs",
    },
    input: { schema: { body: zPremiumXFollowerScraperFollowingDataBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // the actor's charge-event this leaf line joins to
            vendor: "apify-default-dataset-item",
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.00015 },
        },
        /** Mode-aware: each enabled direction contributes its own cap
         *  (getFollowers → maxFollowers, getFollowing → maxFollowings —
         *  all four fields required by the schema). Both off ⇒ nothing
         *  scraped, but the actor still starts — estimate 0. */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "RESULT": (body.getFollowers ? body.maxFollowers : 0) +
                        (body.getFollowing ? body.maxFollowings : 0),
                },
            };
        },
    },
});
