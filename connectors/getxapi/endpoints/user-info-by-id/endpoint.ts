import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserInfoByIdQueryParams } from "./schema/inputs.ts";

/** GET /user/info_by_id: Get X (Twitter) Profile by ID. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Profile by ID",
        summary: "One profile by numeric user id; resolves an id back to a " +
            "username.",
        description:
            "Look up an X account by its numeric user id and get the same " +
            "profile as `getxapi#user/info`, including the current " +
            "username. A user id never changes, even when the account is " +
            "renamed, so this is how to recover today's handle from an id " +
            "stored earlier.",
        docsUrl: "https://docs.getxapi.com/docs/users/user-info-by-id",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/info_by_id" },
    input: { schema: { queryParams: zUserInfoByIdQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "profile",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
