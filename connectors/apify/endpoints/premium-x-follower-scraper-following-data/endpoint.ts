import { defineEndpoint } from "@shared/core";
import { zPremiumXFollowerScraperFollowingDataBody } from "./schema/inputs.ts";

/**
 * kaitoeasyapi/premium-x-follower-scraper-following-data — Get X (Twitter) Followers. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
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
    request: {
        method: "POST",
        path:
            "/v2/acts/kaitoeasyapi~premium-x-follower-scraper-following-data/runs",
    },
    input: { schema: { body: zPremiumXFollowerScraperFollowingDataBody } },
});
