import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zListMembersQueryParams } from "./schema/inputs.ts";

/** GET /list/members: Get X (Twitter) List Members. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) List Members",
        summary: "Members of a public X list, as profiles.",
        description:
            "Page through the members of a public X list, about 20 per " +
            "call, as full profiles. The list id is the number in the list " +
            "URL (`x.com/i/lists/<id>`). A curated list is a quick seed set " +
            "for a niche or an industry.",
        docsUrl: "https://docs.getxapi.com/docs/lists/list-members",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/list/members" },
    input: { schema: { queryParams: zListMembersQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "members page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
