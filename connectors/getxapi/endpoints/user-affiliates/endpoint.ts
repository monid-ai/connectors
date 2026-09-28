import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserAffiliatesQueryParams } from "./schema/inputs.ts";

/** GET /user/affiliates: Get X (Twitter) Organization Affiliates. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Organization Affiliates",
        summary: "Accounts affiliated with a verified organization.",
        description:
            "List the accounts a verified organization has affiliated with " +
            "itself on X, such as its employees, products, or sub-brands, " +
            "as full profiles. Returns an empty page for accounts that are " +
            "not verified organizations.",
        docsUrl: "https://docs.getxapi.com/docs/users/user-affiliates",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/affiliates" },
    input: { schema: { queryParams: zUserAffiliatesQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "affiliates page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
