import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserMentionsQueryParams } from "./schema/inputs.ts";

/** GET /user/mentions: Get X (Twitter) Mentions. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Mentions",
        summary: "Recent tweets that mention an account.",
        description:
            "Page through recent tweets by other accounts that mention a " +
            "username, newest first, about 20 per call, with author " +
            "profiles. Useful for brand monitoring and support triage. For " +
            "a filtered or time-bounded version, use " +
            "`getxapi#tweet/advanced_search` with `@<username>` in `q`.",
        docsUrl: "https://docs.getxapi.com/docs/users/user-mentions",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/mentions" },
    input: { schema: { queryParams: zUserMentionsQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "mentions page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
