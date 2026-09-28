import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserVerifiedFollowersQueryParams } from "./schema/inputs.ts";

/** GET /user/verified_followers: Get X (Twitter) Verified Followers. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Verified Followers",
        summary: "Only the verified (blue check) followers of an account.",
        description:
            "Page through the verified accounts that follow a user, about " +
            "20 per call, as full profiles. A quick way to measure an " +
            "account's reach among verified users without paging every " +
            "follower.",
        docsUrl: "https://docs.getxapi.com/docs/users/verified-followers",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/verified_followers" },
    input: { schema: { queryParams: zUserVerifiedFollowersQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "followers page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
