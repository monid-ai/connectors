import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCommunityInfoQueryParams } from "./schema/inputs.ts";

/** GET /community/info: Get X (Twitter) Community. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Community",
        summary: "Community details: members, rules, moderators, topic.",
        description:
            "Read an X Community: name, description, creation date, member " +
            "and moderator counts, banner, join and invite policy, NSFW " +
            "flag, primary topic, rules, and search tags. The id is the " +
            "number in `x.com/i/communities/<id>`.",
        docsUrl: "https://docs.getxapi.com/docs/community/community-info",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/community/info" },
    input: { schema: { queryParams: zCommunityInfoQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "community",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
