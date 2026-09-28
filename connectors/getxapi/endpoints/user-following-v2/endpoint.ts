import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserFollowingV2QueryParams } from "./schema/inputs.ts";

/** GET /user/following_v2: Get X (Twitter) Following. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Following",
        summary: "Accounts a user follows, as profiles, about 70 per page.",
        description:
            "Page through the accounts a user follows, about 70 per call, " +
            "as full profiles including `canDm`. The reverse direction is " +
            "`getxapi#user/followers`.",
        docsUrl: "https://docs.getxapi.com/docs/users/following-v2",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/following_v2" },
    input: { schema: { queryParams: zUserFollowingV2QueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "following page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
