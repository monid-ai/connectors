import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserSearchQueryParams } from "./schema/inputs.ts";

/** GET /user/search: Search X (Twitter) Accounts. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Search X (Twitter) Accounts",
        summary: "Find accounts by name, username, or topic.",
        description:
            "Search X accounts by keyword, name, username, or topic, the " +
            "same search X runs in its People tab. Returns about 20 full " +
            "profiles per call. When you already know the exact username, " +
            "`getxapi#user/info` is one direct lookup instead.",
        docsUrl: "https://docs.getxapi.com/docs/users/user-search",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/search" },
    input: { schema: { queryParams: zUserSearchQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "search page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
