import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserStatusQueryParams } from "./schema/inputs.ts";

/** GET /user/status: Check X (Twitter) Account Status. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Check X (Twitter) Account Status",
        summary: "Is an account alive, suspended, or not found?",
        description:
            "Report whether an X account exists and is usable: `status` is " +
            "`alive`, `suspended`, or `not_found`, with the numeric id when " +
            "alive. It answers 200 in every case, so unlike a failed " +
            "profile lookup (a 404 that says nothing about why) it tells a " +
            "suspended account from a missing one. Use it to clean a list " +
            "of handles before collecting from them.",
        docsUrl: "https://docs.getxapi.com/docs/users/user-status",
        categories: ["twitter"],
        notes: [
            "Billed at the flat price for every answer, `not_found` " +
            "included, because every answer is a 200.",
        ],
    },
    request: { method: "GET", path: "/user/status" },
    input: { schema: { queryParams: zUserStatusQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "status check",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
