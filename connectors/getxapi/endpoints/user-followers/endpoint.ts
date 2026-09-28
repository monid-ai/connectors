import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserFollowersQueryParams } from "./schema/inputs.ts";

/** GET /user/followers: Get X (Twitter) Followers. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Followers",
        summary: "An account's followers as full profiles, up to 200 per page.",
        description:
            "Page through the accounts that follow a user, as full profiles " +
            "(name, bio, counts, verification, `canDm`). Up to 200 per call " +
            "on large accounts, the largest page of any follower endpoint " +
            "here, so the fewest billed calls for a full export. " +
            "`getxapi#user/followers_v2` returns about 70 per page; " +
            "`getxapi#user/verified_followers` returns only verified " +
            "followers.",
        docsUrl: "https://docs.getxapi.com/docs/users/followers",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/followers" },
    input: { schema: { queryParams: zUserFollowersQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "followers page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
