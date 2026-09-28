import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserInfoQueryParams } from "./schema/inputs.ts";

/** GET /user/info: Get X (Twitter) Profile. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Profile",
        summary: "One profile by username: bio, counts, verification, pinned " +
            "tweet.",
        description:
            "Look up an X account by username: numeric id, display name, " +
            "bio, location, website, profile and banner images, follower, " +
            "following, tweet, like and media counts, verification (legacy " +
            "and blue), protected flag, `canDm`, creation date, and pinned " +
            "tweet ids. This is the username-to-id resolver for every " +
            "id-based endpoint. By numeric id instead, use " +
            "`getxapi#user/info_by_id`; for account age, where it is based " +
            "and username history, `getxapi#user/user_about`.",
        docsUrl: "https://docs.getxapi.com/docs/users/user-info",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/info" },
    input: { schema: { queryParams: zUserInfoQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "profile",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
