import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserFollowersV2QueryParams } from "./schema/inputs.ts";

/** GET /user/followers_v2: Get X (Twitter) Followers v2. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Followers v2",
        summary: "A user's followers as profiles, about 70 per page.",
        description:
            "Page through a user's followers, about 70 per call, as full " +
            "profiles including `canDm` (whether that follower accepts " +
            "direct messages). A second route to the same follower graph as " +
            "`getxapi#user/followers`, which returns up to 200 per call and " +
            "so costs fewer calls for a full export.",
        docsUrl: "https://docs.getxapi.com/docs/users/followers-v2",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/followers_v2" },
    input: { schema: { queryParams: zUserFollowersV2QueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "followers page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
