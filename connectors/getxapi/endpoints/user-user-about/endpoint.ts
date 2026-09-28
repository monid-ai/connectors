import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserAboutQueryParams } from "./schema/inputs.ts";

/** GET /user/user_about: Get X (Twitter) Account About. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Account About",
        summary:
            "Account metadata: creation date, where it is based, username " +
            "history.",
        description:
            "Read the transparency details X shows on an account's About " +
            "page: creation date, the country the account is based in, how " +
            "it was created, identity verification and since when, and the " +
            "number of username changes with the date of the last one. " +
            "Useful for spotting renamed, repurposed, or foreign-run " +
            "accounts. For bio and counts, use `getxapi#user/info`.",
        docsUrl: "https://docs.getxapi.com/docs/users/user-about",
        categories: ["twitter"],
        notes: [
            "`accountBasedIn` and `createdVia` are null when X does not " +
            "publish them for that account.",
        ],
    },
    request: { method: "GET", path: "/user/user_about" },
    input: { schema: { queryParams: zUserAboutQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "about page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
