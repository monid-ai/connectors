import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserMediaQueryParams } from "./schema/inputs.ts";

/** GET /user/media: Get X (Twitter) User Media. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) User Media",
        summary: "An account's tweets that carry images or video.",
        description:
            "Page through a user's tweets that contain photos, videos, or " +
            "GIFs, as full tweet objects with their `media` attached. For " +
            "every tweet regardless of media, use `getxapi#user/tweets`.",
        docsUrl: "https://docs.getxapi.com/docs/users/user-media",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/media" },
    input: { schema: { queryParams: zUserMediaQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "media page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
